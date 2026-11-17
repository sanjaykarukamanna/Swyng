"""
Trade routes: CRUD and dashboard for trades.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models import (
    CloseTradeRequest,
    DashboardResponse,
    TradeDetailResponse,
    TradeResponse,
    TradeWithPrice,
)
from app.telegram_bot import get_bot_status, process_digest_text
from app.yahoo_finance import fetch_price
from app import analytics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/trades", tags=["trades"])


def _row_to_dict(row) -> Dict[str, Any]:
    """Convert an aiosqlite Row to a dict."""
    if row is None:
        return {}
    return dict(row)


@router.get("", response_model=List[TradeResponse])
async def list_trades(
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
):
    """List trades with optional filters."""
    db = await get_db()

    conditions = []  # type: List[str]
    params = []  # type: List[Any]

    if status:
        conditions.append("status = ?")
        params.append(status.upper())
    if symbol:
        conditions.append("symbol LIKE ?")
        params.append(f"%{symbol.upper()}%")
    if sector:
        conditions.append("sector LIKE ?")
        params.append(f"%{sector}%")
    if date_from:
        conditions.append("created_at >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("created_at <= ?")
        params.append(date_to)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    # Validate sort_by and order to prevent SQL injection
    allowed_sort = {
        "created_at", "symbol", "sector", "rating_score", "entry_price",
        "status", "signal_date", "updated_at",
    }
    if sort_by not in allowed_sort:
        sort_by = "created_at"
    if order.lower() not in ("asc", "desc"):
        order = "desc"

    query = f"SELECT * FROM trades {where} ORDER BY {sort_by} {order}"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    return [_row_to_dict(r) for r in rows]


@router.get("/active", response_model=List[TradeWithPrice])
async def list_active_trades():
    """List active trades with current price info."""
    db = await get_db()

    cursor = await db.execute(
        """SELECT t.*,
                  ps.price as latest_price
           FROM trades t
           LEFT JOIN (
               SELECT trade_id, price,
                      ROW_NUMBER() OVER (PARTITION BY trade_id ORDER BY timestamp DESC) as rn
               FROM price_snapshots
           ) ps ON t.id = ps.trade_id AND ps.rn = 1
           WHERE t.status = 'ACTIVE'
           ORDER BY t.created_at DESC"""
    )
    rows = await cursor.fetchall()

    results = []  # type: List[Dict[str, Any]]
    for row in rows:
        trade = _row_to_dict(row)
        current_price = trade.pop("latest_price", None)
        entry_price = trade.get("entry_price", 0) or 0
        stop_loss = trade.get("stop_loss", 0) or 0
        shares = trade.get("suggested_shares", 0) or 0

        trade["current_price"] = current_price

        if current_price and entry_price:
            trade["unrealized_pnl"] = round((current_price - entry_price) * shares, 2)
            trade["unrealized_pnl_pct"] = round((current_price - entry_price) / entry_price * 100, 2)

            r_unit = entry_price - stop_loss
            if r_unit > 0:
                trade["r_multiple"] = round((current_price - entry_price) / r_unit, 2)
            else:
                trade["r_multiple"] = None
        else:
            trade["unrealized_pnl"] = None
            trade["unrealized_pnl_pct"] = None
            trade["r_multiple"] = None

        # Days held
        signal_date = trade.get("signal_date")
        if signal_date:
            try:
                sd = _try_parse_date(signal_date)
                if sd:
                    trade["days_held"] = (datetime.utcnow() - sd).days
                else:
                    trade["days_held"] = None
            except Exception:
                trade["days_held"] = None
        else:
            trade["days_held"] = None

        results.append(trade)

    return results


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Get dashboard summary data."""
    db = await get_db()

    # Active count
    cursor = await db.execute("SELECT COUNT(*) FROM trades WHERE status = 'ACTIVE'")
    row = await cursor.fetchone()
    active_count = row[0] if row else 0

    # Closed count
    cursor = await db.execute("SELECT COUNT(*) FROM trades WHERE status = 'CLOSED'")
    row = await cursor.fetchone()
    closed_count = row[0] if row else 0

    # Today's signals
    today = datetime.utcnow().strftime("%Y-%m-%d")
    cursor = await db.execute(
        "SELECT COUNT(*) FROM trades WHERE DATE(created_at) = ?",
        (today,),
    )
    row = await cursor.fetchone()
    todays_signals = row[0] if row else 0

    # Analytics
    total_pnl = await analytics.get_total_pnl_with_unrealized()
    summary = await analytics.get_summary()

    return DashboardResponse(
        active_count=active_count,
        closed_count=closed_count,
        todays_signals=todays_signals,
        total_pnl=total_pnl,
        win_rate=summary.get("win_rate", 0.0),
        avg_r_multiple=_avg_r_multiple_from_closed(await analytics.get_r_multiples()),
        avg_holding_days=summary.get("avg_holding_days", 0.0),
        expectancy=summary.get("expectancy", 0.0),
        bot_status=get_bot_status(),
    )


@router.get("/{trade_id}", response_model=TradeDetailResponse)
async def get_trade(trade_id: int):
    """Get a single trade with its price snapshots."""
    db = await get_db()

    cursor = await db.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade = _row_to_dict(row)

    # Price snapshots
    cursor = await db.execute(
        "SELECT id, trade_id, symbol, price, timestamp FROM price_snapshots WHERE trade_id = ? ORDER BY timestamp ASC",
        (trade_id,),
    )
    snapshots = await cursor.fetchall()
    trade["price_snapshots"] = [_row_to_dict(s) for s in snapshots]

    # Current price from latest snapshot
    if trade["price_snapshots"]:
        latest = trade["price_snapshots"][-1]
        current_price = latest.get("price")
    else:
        current_price = None

    entry_price = trade.get("entry_price", 0) or 0
    stop_loss = trade.get("stop_loss", 0) or 0
    shares = trade.get("suggested_shares", 0) or 0

    trade["current_price"] = current_price
    if current_price and entry_price:
        trade["unrealized_pnl"] = round((current_price - entry_price) * shares, 2)
        trade["unrealized_pnl_pct"] = round((current_price - entry_price) / entry_price * 100, 2)
        r_unit = entry_price - stop_loss
        if r_unit > 0:
            trade["r_multiple"] = round((current_price - entry_price) / r_unit, 2)
        else:
            trade["r_multiple"] = None
    else:
        trade["unrealized_pnl"] = None
        trade["unrealized_pnl_pct"] = None
        trade["r_multiple"] = None

    signal_date = trade.get("signal_date")
    if signal_date:
        try:
            sd = _try_parse_date(signal_date)
            if sd:
                trade["days_held"] = (datetime.utcnow() - sd).days
            else:
                trade["days_held"] = None
        except Exception:
            trade["days_held"] = None
    else:
        trade["days_held"] = None

    return trade


@router.put("/{trade_id}/close")
async def close_trade(trade_id: int, body: CloseTradeRequest):
    """Close a trade."""
    db = await get_db()

    cursor = await db.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade = _row_to_dict(row)
    if trade["status"] == "CLOSED":
        raise HTTPException(status_code=400, detail="Trade is already closed")

    close_price = body.close_price
    if close_price is None:
        # Fetch current price
        try:
            fetched = await fetch_price(trade["symbol"])
            if fetched is not None:
                close_price = fetched
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Could not fetch current price. Please provide close_price.",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error fetching price: {str(e)}. Please provide close_price.",
            )

    close_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    await db.execute(
        """UPDATE trades
           SET status = 'CLOSED', close_price = ?, close_date = ?,
               close_reason = ?, updated_at = datetime('now')
           WHERE id = ?""",
        (close_price, close_date, body.close_reason, trade_id),
    )
    await db.commit()

    logger.info("Closed trade #%d (%s) at %.2f — reason: %s",
                trade_id, trade["symbol"], close_price, body.close_reason)

    return {"message": "Trade closed", "trade_id": trade_id, "close_price": close_price}


@router.post("/ingest")
async def ingest_digest_text(body: Dict[str, str]):
    """Ingest raw Telegram message text directly."""
    text = body.get("raw_message", "")
    if not text:
        raise HTTPException(status_code=400, detail="raw_message is required")
    res = await process_digest_text(text)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("detail", "Failed to parse digest"))
    return res


def _avg_r_multiple_from_closed(r_multiples: List[Dict[str, Any]]) -> float:
    """Calculate average R-multiple from list."""
    if not r_multiples:
        return 0.0
    total = sum(r["r_multiple"] for r in r_multiples)
    return round(total / len(r_multiples), 2)


def _try_parse_date(date_str: str) -> Optional[datetime]:
    """Try to parse a date string."""
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%A, %b %d, %Y",
        "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            pass
    return None

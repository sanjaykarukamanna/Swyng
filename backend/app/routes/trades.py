"""
Trade routes: CRUD and dashboard for trades.
"""

import asyncio
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
    compute_trade_metrics,
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
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    sector: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
):
    """List trades with optional filters and pre-computed metrics."""
    db = await get_db()

    conditions = []  # type: List[str]
    params = []  # type: List[Any]

    if status and isinstance(status, str):
        conditions.append("t.status = ?")
        params.append(status.upper())
    if symbol and isinstance(symbol, str):
        conditions.append("t.symbol LIKE ?")
        params.append(f"%{symbol.upper()}%")
    if sector and isinstance(sector, str):
        conditions.append("t.sector LIKE ?")
        params.append(f"%{sector}%")
    if date_from and isinstance(date_from, str):
        conditions.append("t.signal_date >= ?")
        params.append(date_from)
    if date_to and isinstance(date_to, str):
        conditions.append("t.signal_date <= ?")
        params.append(date_to)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    allowed_sort = {
        "created_at", "symbol", "sector", "rating_score", "entry_price",
        "status", "signal_date", "updated_at",
    }
    if sort_by not in allowed_sort:
        sort_by = "created_at"
    if order.lower() not in ("asc", "desc"):
        order = "desc"

    query = f"""
        SELECT t.*, ps.price as latest_price
        FROM trades t
        LEFT JOIN (
            SELECT trade_id, price,
                   ROW_NUMBER() OVER (PARTITION BY trade_id ORDER BY timestamp DESC) as rn
            FROM price_snapshots
        ) ps ON t.id = ps.trade_id AND ps.rn = 1
        {where}
        ORDER BY t.{sort_by} {order}
    """
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    results = []
    for r in rows:
        trade = _row_to_dict(r)
        latest_price = trade.pop("latest_price", None)
        is_closed = trade.get("status") == "CLOSED"
        price_to_use = trade.get("close_price") if is_closed else (latest_price or trade.get("price_at_signal") or trade.get("entry_price"))

        trade["current_price"] = price_to_use
        metrics = compute_trade_metrics(
            trade.get("entry_price"),
            price_to_use,
            trade.get("stop_loss"),
            trade.get("suggested_shares"),
            trade.get("signal_date"),
            trade.get("close_date"),
        )
        trade.update(metrics)
        results.append(trade)

    return results


@router.get("/active", response_model=List[TradeWithPrice])
async def list_active_trades():
    """List active trades with current price and unrealized PnL info."""
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
        current_price = trade.pop("latest_price", None) or trade.get("price_at_signal") or trade.get("entry_price")
        trade["current_price"] = current_price

        metrics = compute_trade_metrics(
            trade.get("entry_price"),
            current_price,
            trade.get("stop_loss"),
            trade.get("suggested_shares"),
            trade.get("signal_date"),
        )
        trade.update(metrics)
        trade["unrealized_pnl"] = trade["pnl"]
        trade["unrealized_pnl_pct"] = trade["pnl_pct"]
        results.append(trade)

    return results


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Get dashboard summary data with parallel aggregated execution."""
    db = await get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    async def _fetch_counts():
        cursor = await db.execute(
            """SELECT
                   COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN 1 ELSE 0 END), 0)
               FROM trades""",
            (today,),
        )
        row = await cursor.fetchone()
        return (row[0], row[1], row[2]) if row else (0, 0, 0)

    (counts, total_pnl, summary, r_multiples) = await asyncio.gather(
        _fetch_counts(),
        analytics.get_total_pnl_with_unrealized(),
        analytics.get_summary(),
        analytics.get_r_multiples(),
    )

    active_count, closed_count, todays_signals = counts

    return DashboardResponse(
        active_count=active_count,
        closed_count=closed_count,
        todays_signals=todays_signals,
        total_pnl=total_pnl,
        win_rate=summary.get("win_rate", 0.0),
        avg_r_multiple=_avg_r_multiple_from_closed(r_multiples),
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
        current_price = trade.get("price_at_signal") or trade.get("entry_price")

    is_closed = trade.get("status") == "CLOSED"
    effective_price = trade.get("close_price") if is_closed else current_price
    trade["current_price"] = effective_price

    metrics = compute_trade_metrics(
        trade.get("entry_price"),
        effective_price,
        trade.get("stop_loss"),
        trade.get("suggested_shares"),
        trade.get("signal_date"),
        trade.get("close_date"),
    )
    trade.update(metrics)
    trade["unrealized_pnl"] = trade["pnl"]
    trade["unrealized_pnl_pct"] = trade["pnl_pct"]

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

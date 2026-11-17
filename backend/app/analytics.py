"""
Analytics calculations: R-multiple, win rate, expectancy, drawdown, etc.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.database import get_db

logger = logging.getLogger(__name__)


async def get_summary() -> Dict[str, Any]:
    """Calculate overall analytics summary."""
    db = await get_db()

    # Total trades
    cursor = await db.execute("SELECT COUNT(*) FROM trades")
    row = await cursor.fetchone()
    total_trades = row[0] if row else 0

    # Closed trades
    cursor = await db.execute("SELECT COUNT(*) FROM trades WHERE status = 'CLOSED'")
    row = await cursor.fetchone()
    closed_trades = row[0] if row else 0

    if closed_trades == 0:
        return {
            "total_pnl": 0.0,
            "win_rate": 0.0,
            "avg_return_pct": 0.0,
            "expectancy": 0.0,
            "avg_holding_days": 0.0,
            "total_trades": total_trades,
            "closed_trades": 0,
            "max_drawdown_pct": 0.0,
        }

    # Closed trade data
    cursor = await db.execute(
        """SELECT entry_price, close_price, stop_loss, suggested_shares,
                  signal_date, close_date
           FROM trades WHERE status = 'CLOSED' AND close_price IS NOT NULL"""
    )
    closed = await cursor.fetchall()

    total_pnl = 0.0
    wins = 0
    total_win_pnl = 0.0
    total_loss_pnl = 0.0
    loss_count = 0
    return_pcts = []  # type: List[float]
    holding_days_list = []  # type: List[float]

    for t in closed:
        entry = t[0] or 0.0
        close = t[1] or 0.0
        shares = t[3] or 0
        signal_date_str = t[4]
        close_date_str = t[5]

        pnl = (close - entry) * shares
        total_pnl += pnl

        if entry > 0:
            return_pcts.append((close - entry) / entry * 100)

        if close > entry:
            wins += 1
            total_win_pnl += pnl
        else:
            loss_count += 1
            total_loss_pnl += abs(pnl)

        # Holding days
        if signal_date_str and close_date_str:
            try:
                sd = _parse_date(signal_date_str)
                cd = _parse_date(close_date_str)
                if sd and cd:
                    holding_days_list.append((cd - sd).days)
            except Exception:
                pass

    win_rate = (wins / len(closed) * 100) if closed else 0.0
    avg_return_pct = (sum(return_pcts) / len(return_pcts)) if return_pcts else 0.0
    avg_holding_days = (sum(holding_days_list) / len(holding_days_list)) if holding_days_list else 0.0

    # Expectancy
    avg_win = (total_win_pnl / wins) if wins > 0 else 0.0
    avg_loss = (total_loss_pnl / loss_count) if loss_count > 0 else 0.0
    expectancy = (win_rate / 100 * avg_win) - ((100 - win_rate) / 100 * avg_loss)

    # Max drawdown
    max_drawdown_pct = await _calculate_max_drawdown()

    return {
        "total_pnl": round(total_pnl, 2),
        "win_rate": round(win_rate, 2),
        "avg_return_pct": round(avg_return_pct, 2),
        "expectancy": round(expectancy, 2),
        "avg_holding_days": round(avg_holding_days, 1),
        "total_trades": total_trades,
        "closed_trades": len(closed),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
    }


async def get_r_multiples() -> List[Dict[str, Any]]:
    """Calculate R-multiples for all closed trades."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT id, symbol, entry_price, close_price, stop_loss, close_reason
           FROM trades WHERE status = 'CLOSED' AND close_price IS NOT NULL"""
    )
    rows = await cursor.fetchall()

    results = []  # type: List[Dict[str, Any]]
    for row in rows:
        trade_id = row[0]
        symbol = row[1]
        entry = row[2] or 0.0
        close = row[3] or 0.0
        sl = row[4] or 0.0
        close_reason = row[5]

        r_unit = entry - sl
        if r_unit > 0:
            r_multiple = (close - entry) / r_unit
        else:
            r_multiple = 0.0

        pnl_pct = ((close - entry) / entry * 100) if entry > 0 else 0.0

        results.append({
            "trade_id": trade_id,
            "symbol": symbol,
            "r_multiple": round(r_multiple, 2),
            "pnl_pct": round(pnl_pct, 2),
            "close_reason": close_reason,
        })

    return results


async def get_sector_performance() -> List[Dict[str, Any]]:
    """Calculate performance by sector for closed trades."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT sector, entry_price, close_price, suggested_shares
           FROM trades WHERE status = 'CLOSED' AND close_price IS NOT NULL"""
    )
    rows = await cursor.fetchall()

    sectors = {}  # type: Dict[str, Dict[str, Any]]
    for row in rows:
        sector = row[0] or "Unknown"
        entry = row[1] or 0.0
        close = row[2] or 0.0
        shares = row[3] or 0

        if sector not in sectors:
            sectors[sector] = {
                "sector": sector,
                "count": 0,
                "wins": 0,
                "losses": 0,
                "returns": [],
                "total_pnl": 0.0,
            }

        sectors[sector]["count"] += 1
        pnl = (close - entry) * shares
        sectors[sector]["total_pnl"] += pnl

        if close > entry:
            sectors[sector]["wins"] += 1
        else:
            sectors[sector]["losses"] += 1

        if entry > 0:
            sectors[sector]["returns"].append((close - entry) / entry * 100)

    results = []  # type: List[Dict[str, Any]]
    for s in sectors.values():
        win_rate = (s["wins"] / s["count"] * 100) if s["count"] > 0 else 0.0
        avg_return = (sum(s["returns"]) / len(s["returns"])) if s["returns"] else 0.0
        results.append({
            "sector": s["sector"],
            "count": s["count"],
            "wins": s["wins"],
            "losses": s["losses"],
            "win_rate": round(win_rate, 2),
            "avg_return": round(avg_return, 2),
            "total_pnl": round(s["total_pnl"], 2),
        })

    return results


async def get_returns_curve() -> List[Dict[str, Any]]:
    """Get cumulative returns over time (by close_date)."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT close_date, entry_price, close_price, suggested_shares
           FROM trades
           WHERE status = 'CLOSED' AND close_price IS NOT NULL AND close_date IS NOT NULL
           ORDER BY close_date ASC"""
    )
    rows = await cursor.fetchall()

    cumulative_pnl = 0.0
    total_invested = 0.0
    results = []  # type: List[Dict[str, Any]]

    for row in rows:
        close_date = row[0]
        entry = row[1] or 0.0
        close = row[2] or 0.0
        shares = row[3] or 0

        pnl = (close - entry) * shares
        cumulative_pnl += pnl
        total_invested += entry * shares

        cum_return_pct = (cumulative_pnl / total_invested * 100) if total_invested > 0 else 0.0

        results.append({
            "date": close_date,
            "cumulative_pnl": round(cumulative_pnl, 2),
            "cumulative_return_pct": round(cum_return_pct, 2),
        })

    return results


async def get_drawdown_curve() -> List[Dict[str, Any]]:
    """Calculate drawdown over time from cumulative P&L."""
    returns = await get_returns_curve()
    if not returns:
        return []

    peak = 0.0
    results = []  # type: List[Dict[str, Any]]

    for entry in returns:
        cum_pnl = entry["cumulative_pnl"]
        if cum_pnl > peak:
            peak = cum_pnl

        if peak > 0:
            drawdown_pct = (peak - cum_pnl) / peak * 100
        else:
            drawdown_pct = 0.0

        results.append({
            "date": entry["date"],
            "drawdown_pct": round(drawdown_pct, 2),
        })

    return results


async def get_total_pnl_with_unrealized() -> float:
    """Get total P&L including unrealized from active trades."""
    db = await get_db()

    # Realized P&L from closed trades
    cursor = await db.execute(
        """SELECT COALESCE(SUM((close_price - entry_price) * suggested_shares), 0)
           FROM trades WHERE status = 'CLOSED' AND close_price IS NOT NULL"""
    )
    row = await cursor.fetchone()
    realized = row[0] if row else 0.0

    # Unrealized P&L from active trades (using latest price snapshot)
    cursor = await db.execute(
        """SELECT t.entry_price, t.suggested_shares, ps.price
           FROM trades t
           LEFT JOIN (
               SELECT trade_id, price,
                      ROW_NUMBER() OVER (PARTITION BY trade_id ORDER BY timestamp DESC) as rn
               FROM price_snapshots
           ) ps ON t.id = ps.trade_id AND ps.rn = 1
           WHERE t.status = 'ACTIVE' AND ps.price IS NOT NULL"""
    )
    active_rows = await cursor.fetchall()

    unrealized = 0.0
    for ar in active_rows:
        entry = ar[0] or 0.0
        shares = ar[1] or 0
        current = ar[2] or 0.0
        unrealized += (current - entry) * shares

    return round(realized + unrealized, 2)


async def _calculate_max_drawdown() -> float:
    """Calculate max drawdown percentage from cumulative P&L curve."""
    returns = await get_returns_curve()
    if not returns:
        return 0.0

    peak = 0.0
    max_dd = 0.0

    for entry in returns:
        cum_pnl = entry["cumulative_pnl"]
        if cum_pnl > peak:
            peak = cum_pnl
        if peak > 0:
            dd = (peak - cum_pnl) / peak * 100
            if dd > max_dd:
                max_dd = dd

    return max_dd


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse canonical ISO date."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d")
    except Exception:
        return None

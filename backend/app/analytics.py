"""
Analytics calculations: R-multiple, win rate, expectancy, drawdown, etc.
Centralized via canonical compute_trade_metrics.
"""

import logging
from typing import Any, Dict, List, Optional

from app.database import get_db
from app.dates import parse_iso_date
from app.models import compute_trade_metrics

logger = logging.getLogger(__name__)


async def get_analyzed_closed_trades() -> List[Dict[str, Any]]:
    """Fetch all closed trades enriched with canonical trade metrics."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT id, symbol, sector, entry_price, close_price, stop_loss,
                  suggested_shares, signal_date, close_date, close_reason
           FROM trades
           WHERE status = 'CLOSED' AND close_price IS NOT NULL
           ORDER BY close_date ASC"""
    )
    rows = await cursor.fetchall()
    results = []
    for row in rows:
        d = dict(row)
        metrics = compute_trade_metrics(
            d.get("entry_price"),
            d.get("close_price"),
            d.get("stop_loss"),
            d.get("suggested_shares"),
            d.get("signal_date"),
            d.get("close_date"),
        )
        d.update(metrics)
        results.append(d)
    return results


async def get_summary() -> Dict[str, Any]:
    """Calculate overall analytics summary."""
    db = await get_db()

    # Total trades
    cursor = await db.execute("SELECT COUNT(*) FROM trades")
    row = await cursor.fetchone()
    total_trades = row[0] if row else 0

    closed = await get_analyzed_closed_trades()
    if not closed:
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

    total_pnl = sum((t["pnl"] or 0.0) for t in closed)
    wins = [t for t in closed if (t["pnl"] or 0.0) > 0]
    losses = [t for t in closed if (t["pnl"] or 0.0) <= 0]
    return_pcts = [t["pnl_pct"] for t in closed if t["pnl_pct"] is not None]
    holding_days = [t["days_held"] for t in closed if t["days_held"] is not None]

    win_rate = (len(wins) / len(closed) * 100) if closed else 0.0
    avg_return_pct = (sum(return_pcts) / len(return_pcts)) if return_pcts else 0.0
    avg_holding_days = (sum(holding_days) / len(holding_days)) if holding_days else 0.0

    avg_win = (sum((t["pnl"] or 0.0) for t in wins) / len(wins)) if wins else 0.0
    avg_loss = (sum(abs(t["pnl"] or 0.0) for t in losses) / len(losses)) if losses else 0.0
    expectancy = (win_rate / 100 * avg_win) - ((100 - win_rate) / 100 * avg_loss)

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
    closed = await get_analyzed_closed_trades()
    return [
        {
            "trade_id": t["id"],
            "symbol": t["symbol"],
            "r_multiple": t.get("r_multiple") or 0.0,
            "pnl_pct": t.get("pnl_pct") or 0.0,
            "close_reason": t.get("close_reason"),
        }
        for t in closed
    ]


async def get_sector_performance() -> List[Dict[str, Any]]:
    """Calculate performance by sector for closed trades."""
    closed = await get_analyzed_closed_trades()
    sectors = {}  # type: Dict[str, Dict[str, Any]]

    for t in closed:
        sec = t.get("sector") or "Unknown"
        if sec not in sectors:
            sectors[sec] = {
                "sector": sec,
                "count": 0,
                "wins": 0,
                "losses": 0,
                "returns": [],
                "total_pnl": 0.0,
            }

        sectors[sec]["count"] += 1
        pnl = t.get("pnl") or 0.0
        sectors[sec]["total_pnl"] += pnl

        if pnl > 0:
            sectors[sec]["wins"] += 1
        else:
            sectors[sec]["losses"] += 1

        if t.get("pnl_pct") is not None:
            sectors[sec]["returns"].append(t["pnl_pct"])

    results = []
    for s in sectors.values():
        win_rate = (s["wins"] / s["count"] * 100) if s["count"] > 0 else 0.0
        avg_ret = (sum(s["returns"]) / len(s["returns"])) if s["returns"] else 0.0
        results.append({
            "sector": s["sector"],
            "count": s["count"],
            "wins": s["wins"],
            "losses": s["losses"],
            "win_rate": round(win_rate, 2),
            "avg_return": round(avg_ret, 2),
            "total_pnl": round(s["total_pnl"], 2),
        })

    return results


async def get_returns_curve() -> List[Dict[str, Any]]:
    """Get cumulative returns over time (by close_date)."""
    closed = await get_analyzed_closed_trades()
    cumulative_pnl = 0.0
    total_invested = 0.0
    results = []

    for t in closed:
        close_date = t.get("close_date")
        if not close_date:
            continue

        pnl = t.get("pnl") or 0.0
        entry = t.get("entry_price") or 0.0
        shares = t.get("suggested_shares") or 0

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
    results = []

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
    """Get total P&L including unrealized from active trades using canonical latest_price_snapshots view."""
    db = await get_db()

    # Realized P&L from closed trades
    cursor = await db.execute(
        """SELECT COALESCE(SUM((close_price - entry_price) * suggested_shares), 0)
           FROM trades WHERE status = 'CLOSED' AND close_price IS NOT NULL"""
    )
    row = await cursor.fetchone()
    realized = row[0] if row else 0.0

    # Unrealized P&L from active trades using latest_price_snapshots view
    cursor = await db.execute(
        """SELECT t.entry_price, t.suggested_shares, ps.price
           FROM trades t
           JOIN latest_price_snapshots ps ON t.id = ps.trade_id
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

"""
Yahoo Finance price fetcher using yfinance.
Runs synchronous yfinance calls in a thread executor.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

import yfinance as yf

from app.database import get_db

logger = logging.getLogger(__name__)


def _fetch_price_sync(symbol: str) -> Optional[float]:
    """Synchronously fetch the latest price for a symbol using yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d")
        if hist.empty:
            logger.warning("No price data for %s", symbol)
            return None
        return float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.warning("Error fetching price for %s: %s", symbol, e)
        return None


async def fetch_price(symbol: str) -> Optional[float]:
    """Async wrapper: fetch the latest price for a symbol."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _fetch_price_sync, symbol)


async def fetch_and_store_price(trade_id: int, symbol: str) -> Optional[float]:
    """Fetch the current price and store a snapshot in the database."""
    price = await fetch_price(symbol)
    if price is None:
        return None

    db = await get_db()
    await db.execute(
        "INSERT INTO price_snapshots (trade_id, symbol, price) VALUES (?, ?, ?)",
        (trade_id, symbol, price),
    )
    await db.commit()
    return price


async def refresh_active_trade_prices() -> int:
    """Fetch and store prices for all active trades in parallel. Returns count refreshed."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, symbol FROM trades WHERE status = 'ACTIVE'"
    )
    active_trades = await cursor.fetchall()
    if not active_trades:
        return 0

    async def _update_single(trade_id: int, symbol: str) -> bool:
        price = await fetch_and_store_price(trade_id, symbol)
        if price is not None:
            logger.info("Refreshed price for %s: %.2f", symbol, price)
            return True
        return False

    results = await asyncio.gather(
        *[_update_single(trade[0], trade[1]) for trade in active_trades],
        return_exceptions=True,
    )
    count = sum(1 for r in results if r is True)
    logger.info("Refreshed prices for %d/%d active trades", count, len(active_trades))
    return count


async def check_entry_met(trade_id: int, symbol: str, entry_ceiling: float) -> bool:
    """
    Fetch current price and check if it meets the entry ceiling.
    Updates the trade's price_at_signal and entry_met fields.
    Returns True if entry criteria is met.
    """
    price = await fetch_price(symbol)
    if price is None:
        return False

    entry_met = 1 if price <= entry_ceiling else 0

    db = await get_db()
    await db.execute(
        "UPDATE trades SET price_at_signal = ?, entry_met = ?, updated_at = datetime('now') WHERE id = ?",
        (price, entry_met, trade_id),
    )
    await db.commit()

    # Store snapshot
    await db.execute(
        "INSERT INTO price_snapshots (trade_id, symbol, price) VALUES (?, ?, ?)",
        (trade_id, symbol, price),
    )
    await db.commit()

    logger.info(
        "Price check for %s: %.2f (ceiling: %.2f) → entry_met=%s",
        symbol, price, entry_ceiling, bool(entry_met),
    )
    return bool(entry_met)

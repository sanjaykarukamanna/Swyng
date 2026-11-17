import logging
import os
from typing import Optional

import aiosqlite

from app.config import settings

logger = logging.getLogger(__name__)

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        db_dir = os.path.dirname(settings.database_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        _db = await aiosqlite.connect(settings.database_path)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        logger.info("Database connected: %s", settings.database_path)
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
        logger.info("Database connection closed")


async def init_db() -> None:
    db = await get_db()

    await db.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            sector TEXT,
            rating TEXT,
            rating_score INTEGER,
            entry_price REAL,
            entry_ceiling REAL,
            stop_loss REAL,
            target_price REAL,
            suggested_shares INTEGER,
            suggested_value REAL,
            rsi REAL,
            ema_trend TEXT,
            signal_date TEXT,
            market_regime TEXT,
            price_at_signal REAL,
            entry_met INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ACTIVE',
            close_price REAL,
            close_date TEXT,
            close_reason TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            first_signal_date TEXT,
            last_signal_date TEXT,
            signal_count INTEGER DEFAULT 1
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS price_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id INTEGER REFERENCES trades(id),
            symbol TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp TEXT DEFAULT (datetime('now'))
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS daily_digests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE,
            market_regime TEXT,
            setups_found INTEGER,
            raw_message TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    await db.execute("""
        CREATE VIEW IF NOT EXISTS latest_price_snapshots AS
        SELECT ps.trade_id, ps.symbol, ps.price, ps.timestamp
        FROM price_snapshots ps
        INNER JOIN (
            SELECT trade_id, MAX(id) AS max_id
            FROM price_snapshots
            GROUP BY trade_id
        ) latest ON ps.id = latest.max_id
    """)

    await db.commit()
    logger.info("Database tables and views initialized")

"""
Telegram bot using python-telegram-bot with long polling.
Receives forwarded swing trading digest messages.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from telegram import Update
from telegram.ext import (
    Application,
    ContextTypes,
    MessageHandler,
    filters,
)

from app.config import settings
from app.database import get_db
from app.parser import parse_digest_message
from app.yahoo_finance import check_entry_met

logger = logging.getLogger(__name__)

# Bot state tracking
_bot_running = False
_last_message_at = None  # type: Optional[str]
_messages_processed = 0
_application = None  # type: Optional[Application]


def get_bot_status() -> dict:
    """Return current bot status."""
    return {
        "running": _bot_running,
        "last_message_at": _last_message_at,
        "messages_processed": _messages_processed,
    }


async def process_digest_text(text: str) -> dict:
    """Core logic to process digest message, deduplicate stocks, and store trades."""
    global _last_message_at, _messages_processed

    digest = parse_digest_message(text)
    if digest is None:
        logger.info("Message is not a valid digest, ignoring")
        return {"success": False, "detail": "Invalid digest format", "new_count": 0, "skip_count": 0}

    _last_message_at = datetime.utcnow().isoformat()
    _messages_processed += 1

    logger.info(
        "Processing digest: date=%s, regime=%s, %d stocks",
        digest.date, digest.market_regime, len(digest.stocks),
    )

    db = await get_db()

    # Store daily digest
    try:
        await db.execute(
            """INSERT OR IGNORE INTO daily_digests (date, market_regime, setups_found, raw_message)
               VALUES (?, ?, ?, ?)""",
            (digest.date, digest.market_regime, digest.setups_found, digest.raw_message),
        )
        await db.commit()
    except Exception as e:
        logger.warning("Error storing daily digest: %s", e)

    new_count = 0
    skip_count = 0
    new_trade_entries = []  # type: List[Tuple[int, str, float]]

    for stock in digest.stocks:
        # Deduplication: check for existing active trade within 14 days
        cursor = await db.execute(
            """SELECT id, first_signal_date, signal_count
               FROM trades
               WHERE symbol = ? AND status = 'ACTIVE'
               ORDER BY created_at DESC LIMIT 1""",
            (stock.symbol,),
        )
        existing = await cursor.fetchone()

        if existing is not None:
            existing_id = existing[0]
            first_signal = existing[1]

            # Check if within 14 days
            if first_signal and _is_within_days(first_signal, digest.date, 14):
                # Update existing trade
                new_signal_count = (existing[2] or 1) + 1
                await db.execute(
                    """UPDATE trades
                       SET last_signal_date = ?, signal_count = ?, updated_at = datetime('now')
                       WHERE id = ?""",
                    (digest.date, new_signal_count, existing_id),
                )
                await db.commit()
                skip_count += 1
                logger.info("Skipped %s (duplicate, signal #%d)", stock.symbol, new_signal_count)
                continue

        # Create new trade
        await db.execute(
            """INSERT INTO trades (
                   symbol, sector, rating, rating_score,
                   entry_price, entry_ceiling, stop_loss, target_price,
                   suggested_shares, suggested_value,
                   rsi, ema_trend, signal_date, market_regime,
                   first_signal_date, last_signal_date, signal_count
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (
                stock.symbol, stock.sector, stock.rating, stock.rating_score,
                stock.entry_price, stock.entry_ceiling, stock.stop_loss, stock.target_price,
                stock.suggested_shares, stock.suggested_value,
                stock.rsi, stock.ema_trend, digest.date, digest.market_regime,
                digest.date, digest.date,
            ),
        )
        await db.commit()
        new_count += 1
        logger.info("Created trade for %s", stock.symbol)

        # Get the new trade ID
        cursor = await db.execute("SELECT last_insert_rowid()")
        row = await cursor.fetchone()
        trade_id = row[0] if row else None
        if trade_id:
            new_trade_entries.append((trade_id, stock.symbol, stock.entry_ceiling))

    # Parallelize entry verification across all new stocks
    if new_trade_entries:
        await asyncio.gather(
            *[check_entry_met(t_id, sym, ceil) for t_id, sym, ceil in new_trade_entries],
            return_exceptions=True,
        )

    return {
        "success": True,
        "date": digest.date,
        "market_regime": digest.market_regime,
        "new_count": new_count,
        "skip_count": skip_count,
    }


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle incoming messages — parse digest and store trades."""
    if update.message is None:
        return

    # Optional chat ID filter
    if settings.telegram_chat_id:
        chat_id = str(update.message.chat_id)
        if chat_id != settings.telegram_chat_id:
            logger.debug("Ignoring message from chat %s (not %s)", chat_id, settings.telegram_chat_id)
            return

    text = update.message.text or ""

    # Also handle forwarded message text
    if not text and update.message.forward_date:
        text = update.message.text or ""

    if not text:
        return

    logger.info("Received Telegram message from chat %s", update.message.chat_id)
    res = await process_digest_text(text)

    if not res.get("success"):
        return

    # Send confirmation back to Telegram
    try:
        await update.message.reply_text(
            f"✅ Digest processed!\n"
            f"📊 {res['new_count']} new trades added, {res['skip_count']} duplicates skipped.\n"
            f"📅 Date: {res['date']}\n"
            f"🏛️ Market: {res['market_regime']}"
        )
    except Exception as e:
        logger.warning("Error sending reply: %s", e)


def _is_within_days(first_date_str: str, new_date_str: str, days: int = 14) -> bool:
    """Check if new_date is within N days of first_date using ISO format."""
    try:
        d1 = datetime.strptime(first_date_str[:10], "%Y-%m-%d")
        d2 = datetime.strptime(new_date_str[:10], "%Y-%m-%d")
        return abs((d2 - d1).days) <= days
    except Exception:
        return False


async def start_bot() -> None:
    """Start the Telegram bot with long polling."""
    global _bot_running, _application

    if not settings.telegram_bot_token or settings.telegram_bot_token == "your_bot_token_here":
        logger.warning("TELEGRAM_BOT_TOKEN not configured — bot will not start")
        return

    logger.info("Starting Telegram bot...")

    _application = Application.builder().token(settings.telegram_bot_token).build()

    # Register message handler (handles all text messages, including forwarded)
    _application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    # Initialize and start polling
    await _application.initialize()
    await _application.start()
    await _application.updater.start_polling(drop_pending_updates=True)

    _bot_running = True
    logger.info("Telegram bot started (long polling)")


async def stop_bot() -> None:
    """Stop the Telegram bot."""
    global _bot_running, _application

    if _application is not None:
        logger.info("Stopping Telegram bot...")
        try:
            if _application.updater and _application.updater.running:
                await _application.updater.stop()
            await _application.stop()
            await _application.shutdown()
        except Exception as e:
            logger.warning("Error stopping bot: %s", e)
        _bot_running = False
        _application = None
        logger.info("Telegram bot stopped")

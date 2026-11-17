"""
FastAPI application with lifespan context manager.
Starts the Telegram bot and background price refresher.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, get_db, init_db
from app.models import BotStatusResponse, HealthResponse
from app.routes import analytics as analytics_routes
from app.routes import prices as prices_routes
from app.routes import trades as trades_routes
from app.telegram_bot import get_bot_status, start_bot, stop_bot
from app.yahoo_finance import refresh_active_trade_prices

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Background task reference
_price_refresh_task = None  # type: asyncio.Task


async def _price_refresh_loop() -> None:
    """Background loop that refreshes active trade prices periodically."""
    interval = settings.price_refresh_interval
    logger.info("Price refresh loop started (interval: %ds)", interval)

    while True:
        try:
            await asyncio.sleep(interval)
            count = await refresh_active_trade_prices()
            logger.info("Background price refresh complete: %d trades updated", count)
        except asyncio.CancelledError:
            logger.info("Price refresh loop cancelled")
            break
        except Exception as e:
            logger.warning("Error in price refresh loop: %s", e)
            await asyncio.sleep(60)  # Wait a bit before retrying on error


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager: starts bot + price refresher on startup, stops on shutdown."""
    global _price_refresh_task

    # Startup
    logger.info("Starting application...")
    await init_db()

    # Start Telegram bot
    try:
        await start_bot()
    except Exception as e:
        logger.warning("Failed to start Telegram bot: %s", e)

    # Start background price refresher
    _price_refresh_task = asyncio.create_task(_price_refresh_loop())

    yield

    # Shutdown
    logger.info("Shutting down application...")

    # Stop price refresher
    if _price_refresh_task is not None:
        _price_refresh_task.cancel()
        try:
            await _price_refresh_task
        except asyncio.CancelledError:
            pass

    # Stop Telegram bot
    try:
        await stop_bot()
    except Exception as e:
        logger.warning("Error stopping bot: %s", e)

    # Close database
    await close_db()
    logger.info("Application shut down")


# Create FastAPI app
app = FastAPI(
    title="Swing Trading Paper Trade Dashboard",
    description="Backend API for tracking swing trading paper trades via Telegram signals",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trades_routes.router)
app.include_router(analytics_routes.router)
app.include_router(prices_routes.router)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    db_status = "disconnected"
    try:
        db = await get_db()
        await db.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok",
        db=db_status,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/api/bot/status", response_model=BotStatusResponse)
async def bot_status():
    """Get Telegram bot status."""
    status = get_bot_status()
    return BotStatusResponse(**status)

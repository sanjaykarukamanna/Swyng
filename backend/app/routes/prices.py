"""
Price routes: live price lookup and manual refresh.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.models import PriceResponse, RefreshResponse
from app.yahoo_finance import fetch_price, refresh_active_trade_prices

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.get("/{symbol}", response_model=PriceResponse)
async def get_price(symbol: str):
    """Get current price for a symbol from Yahoo Finance."""
    symbol = symbol.upper()
    if not symbol.endswith(".NS"):
        symbol = symbol + ".NS"

    price = await fetch_price(symbol)
    if price is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {symbol}")

    return PriceResponse(
        symbol=symbol,
        price=round(price, 2),
        timestamp=datetime.utcnow().isoformat(),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_prices():
    """Trigger manual refresh of all active trade prices."""
    count = await refresh_active_trade_prices()
    return RefreshResponse(count=count)

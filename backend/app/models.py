from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.dates import parse_iso_date


# --- Parsed signal models ---

class ParsedStock(BaseModel):
    symbol: str
    sector: str
    rating: str
    rating_score: int
    entry_price: float
    entry_ceiling: float
    stop_loss: float
    target_price: float
    suggested_shares: int
    suggested_value: float
    rsi: float
    ema_trend: str


class ParsedDigest(BaseModel):
    date: str
    market_regime: str
    setups_found: int
    stocks: List[ParsedStock]
    raw_message: str


# --- API request / response models ---

def compute_trade_metrics(
    entry_price: Optional[float],
    current_or_close_price: Optional[float],
    stop_loss: Optional[float],
    shares: Optional[int],
    signal_date: Optional[str] = None,
    close_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Canonical calculation for trade PnL, percentage return, R-multiple, and days held."""
    entry = entry_price or 0.0
    price = current_or_close_price
    sh = shares or 0

    pnl = None
    pnl_pct = None
    r_multiple = None

    if price is not None and entry > 0:
        pnl = round((price - entry) * sh, 2)
        pnl_pct = round((price - entry) / entry * 100, 2)
        r_unit = entry - (stop_loss or 0.0)
        if r_unit > 0:
            r_multiple = round((price - entry) / r_unit, 2)

    days_held = None
    if signal_date:
        start = parse_iso_date(signal_date)
        if start:
            end = parse_iso_date(close_date) if close_date else datetime.utcnow()
            if end:
                days_held = max(0, (end - start).days)

    return {
        "pnl": pnl,
        "pnl_pct": pnl_pct,
        "r_multiple": r_multiple,
        "days_held": days_held,
    }


class TradeResponse(BaseModel):
    id: int
    symbol: str
    sector: Optional[str] = None
    rating: Optional[str] = None
    rating_score: Optional[int] = None
    entry_price: Optional[float] = None
    entry_ceiling: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    suggested_shares: Optional[int] = None
    suggested_value: Optional[float] = None
    rsi: Optional[float] = None
    ema_trend: Optional[str] = None
    signal_date: Optional[str] = None
    market_regime: Optional[str] = None
    price_at_signal: Optional[float] = None
    entry_met: Optional[int] = None
    status: Optional[str] = None
    close_price: Optional[float] = None
    close_date: Optional[str] = None
    close_reason: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    first_signal_date: Optional[str] = None
    last_signal_date: Optional[str] = None
    signal_count: Optional[int] = None
    current_price: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    r_multiple: Optional[float] = None
    days_held: Optional[int] = None


class TradeWithPrice(TradeResponse):
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None


class DashboardResponse(BaseModel):
    active_count: int = 0
    closed_count: int = 0
    todays_signals: int = 0
    total_pnl: float = 0.0
    win_rate: float = 0.0
    avg_r_multiple: float = 0.0
    avg_holding_days: float = 0.0
    expectancy: float = 0.0
    bot_status: Dict[str, Any] = Field(default_factory=dict)


# --- Analytics models ---

class AnalyticsSummary(BaseModel):
    total_pnl: float = 0.0
    win_rate: float = 0.0
    avg_return_pct: float = 0.0
    expectancy: float = 0.0
    avg_holding_days: float = 0.0
    total_trades: int = 0
    closed_trades: int = 0
    max_drawdown_pct: float = 0.0


class RMultipleEntry(BaseModel):
    trade_id: int
    symbol: str
    r_multiple: float
    pnl_pct: float
    close_reason: Optional[str] = None


class SectorPerformance(BaseModel):
    sector: str
    count: int
    wins: int
    losses: int
    win_rate: float
    avg_return: float
    total_pnl: float


class ReturnsEntry(BaseModel):
    date: str
    cumulative_pnl: float
    cumulative_return_pct: float


class DrawdownEntry(BaseModel):
    date: str
    drawdown_pct: float


class PriceResponse(BaseModel):
    symbol: str
    price: float
    timestamp: str


class RefreshResponse(BaseModel):
    count: int


class HealthResponse(BaseModel):
    status: str
    db: str
    timestamp: str


class BotStatusResponse(BaseModel):
    running: bool
    last_message_at: Optional[str] = None
    messages_processed: int = 0

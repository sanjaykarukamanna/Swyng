from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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


class TradeWithPrice(TradeResponse):
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None
    r_multiple: Optional[float] = None
    days_held: Optional[int] = None


class TradeDetailResponse(TradeWithPrice):
    price_snapshots: List[Dict[str, Any]] = Field(default_factory=list)


class CloseTradeRequest(BaseModel):
    close_reason: str
    close_price: Optional[float] = None


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

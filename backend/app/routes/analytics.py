"""
Analytics routes.
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter

from app import analytics as analytics_module
from app.models import (
    AnalyticsSummary,
    DrawdownEntry,
    RMultipleEntry,
    ReturnsEntry,
    SectorPerformance,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary():
    """Get overall analytics summary."""
    result = await analytics_module.get_summary()
    return result


@router.get("/r-multiples", response_model=List[RMultipleEntry])
async def get_r_multiples():
    """Get R-multiples for all closed trades."""
    return await analytics_module.get_r_multiples()


@router.get("/sector", response_model=List[SectorPerformance])
async def get_sector_performance():
    """Get performance breakdown by sector."""
    return await analytics_module.get_sector_performance()


@router.get("/returns", response_model=List[ReturnsEntry])
async def get_returns_curve():
    """Get cumulative returns over time."""
    return await analytics_module.get_returns_curve()


@router.get("/drawdown", response_model=List[DrawdownEntry])
async def get_drawdown_curve():
    """Get drawdown curve over time."""
    return await analytics_module.get_drawdown_curve()

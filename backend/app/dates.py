"""
Canonical date parsing and normalization utilities.
"""

from datetime import datetime
import re
from typing import Optional


def canonicalize_date(raw_date: str) -> str:
    """Canonicalize any date string into standard ISO YYYY-MM-DD format."""
    if not raw_date:
        return datetime.utcnow().strftime("%Y-%m-%d")
    clean = raw_date.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
        return clean
    formats = [
        "%A, %b %d, %Y",
        "%a, %b %d, %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(clean, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return clean


def parse_iso_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse standard ISO YYYY-MM-DD or canonicalized date string."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d")
    except Exception:
        return None

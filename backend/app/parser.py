"""
Parser for the Swing Trading Digest message format.

Extracts date, market regime, number of setups, and each individual stock's
entry/SL/target data from a forwarded Telegram digest message.
"""

import logging
import re
from datetime import datetime
from typing import List, Optional

from app.models import ParsedDigest, ParsedStock

logger = logging.getLogger(__name__)


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


def parse_digest_message(text: str) -> Optional[ParsedDigest]:
    """Parse a full digest message and return a ParsedDigest or None."""
    if not text or "DAILY SWING OPPORTUNITIES DIGEST" not in text:
        return None

    # --- Extract header info ---
    date_match = re.search(r"Date:\s*(.+)", text)
    raw_date = date_match.group(1).strip() if date_match else ""
    date_str = canonicalize_date(raw_date)

    regime_match = re.search(r"Market Regime:\s*(.+)", text)
    market_regime = ""
    if regime_match:
        regime_raw = regime_match.group(1).strip()
        # Remove emoji and clean
        regime_raw = re.sub(r"[\U0001f534\U0001f7e2]", "", regime_raw).strip()
        # Extract just the word (Bullish / Bearish)
        regime_word_match = re.search(r"(Bullish|Bearish)", regime_raw, re.IGNORECASE)
        if regime_word_match:
            market_regime = regime_word_match.group(1)
        else:
            market_regime = regime_raw

    setups_match = re.search(r"Setups Found:\s*(\d+)", text)
    setups_found = int(setups_match.group(1)) if setups_match else 0

    # --- Parse individual stocks ---
    stocks = _parse_stocks(text)

    if not stocks:
        logger.warning("No stocks parsed from message")
        return None

    return ParsedDigest(
        date=date_str,
        market_regime=market_regime,
        setups_found=setups_found,
        stocks=stocks,
        raw_message=text,
    )


def _parse_stocks(text: str) -> List[ParsedStock]:
    """Extract individual stock entries from the message text."""
    stocks = []  # type: List[ParsedStock]

    # Split the text into lines
    lines = text.split("\n")

    # Find lines containing .NS symbol pattern — these are stock header lines
    stock_groups = []  # type: List[List[str]]
    current_group = []  # type: List[str]

    for line in lines:
        if re.search(r"[A-Z]+\.NS", line):
            if current_group:
                stock_groups.append(current_group)
            current_group = [line]
        elif current_group:
            current_group.append(line)

    if current_group:
        stock_groups.append(current_group)

    for group in stock_groups:
        stock = _parse_single_stock(group)
        if stock is not None:
            stocks.append(stock)

    return stocks


def _parse_single_stock(lines: List[str]) -> Optional[ParsedStock]:
    """Parse a group of lines into a single ParsedStock."""
    if not lines:
        return None

    header = lines[0]
    block = "\n".join(lines)

    # Symbol and sector and rating from header line
    # Pattern: SYMBOL.NS (Sector) • Rating: STRONG BUY (87/100)
    header_match = re.search(
        r"([A-Z]+\.NS)\s*\(([^)]+)\)\s*.*?Rating:\s*(.*?)\s*\((\d+)/100\)",
        header,
    )
    if not header_match:
        logger.warning("Could not parse stock header: %s", header[:80])
        return None

    symbol = header_match.group(1)
    sector = header_match.group(2).strip()
    rating = header_match.group(3).strip()
    rating_score = int(header_match.group(4))

    # Entry price: ₹1086.10
    entry_match = re.search(r"Entry Setup:\s*₹([\d,.]+)", block)
    entry_price = _parse_number(entry_match.group(1)) if entry_match else 0.0

    # Entry ceiling: (Ceiling: ₹1091.53)
    ceiling_match = re.search(r"Ceiling:\s*₹([\d,.]+)", block)
    entry_ceiling = _parse_number(ceiling_match.group(1)) if ceiling_match else 0.0

    # Stop loss: ₹1007.33
    sl_match = re.search(r"Stop Loss:\s*₹([\d,.]+)", block)
    stop_loss = _parse_number(sl_match.group(1)) if sl_match else 0.0

    # Target: ₹1243.64
    target_match = re.search(r"Target\s*\(2R\):\s*₹([\d,.]+)", block)
    target_price = _parse_number(target_match.group(1)) if target_match else 0.0

    # Shares: 19 shares
    shares_match = re.search(r"(\d+)\s*shares", block)
    suggested_shares = int(shares_match.group(1)) if shares_match else 0

    # Value: ~₹20,636
    value_match = re.search(r"~₹([\d,]+)", block)
    suggested_value = _parse_number(value_match.group(1)) if value_match else 0.0

    # RSI: 43.1
    rsi_match = re.search(r"RSI\s*([\d.]+)", block)
    rsi = float(rsi_match.group(1)) if rsi_match else 0.0

    # EMA trend
    ema_match = re.search(r"((?:\d+\s*&\s*\d+\s*EMA\s*\w+))", block)
    ema_trend = ema_match.group(1).strip() if ema_match else ""

    return ParsedStock(
        symbol=symbol,
        sector=sector,
        rating=rating,
        rating_score=rating_score,
        entry_price=entry_price,
        entry_ceiling=entry_ceiling,
        stop_loss=stop_loss,
        target_price=target_price,
        suggested_shares=suggested_shares,
        suggested_value=suggested_value,
        rsi=rsi,
        ema_trend=ema_trend,
    )


def _parse_number(s: str) -> float:
    """Parse a number string, removing commas."""
    return float(s.replace(",", ""))


if __name__ == "__main__":
    sample = """🎯 DAILY SWING OPPORTUNITIES DIGEST
• Date: Tuesday, Nov 17, 2026
• Market Regime: 🟢 Bullish (Nifty > 50 EMA)
• Setups Found: 7 candidates (Ranked by Strength)
━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ CYIENT.NS (Technology) • Rating: STRONG BUY (87/100)
• Entry Setup: ₹1086.10 (Ceiling: ₹1091.53)
• Stop Loss: ₹1007.33 (Structural SL) | Target (2R): ₹1243.64
• Sizing (1.5% Risk): 19 shares (~₹20,636)
• Tech: RSI 43.1 | 20 & 200 EMA uptrend
2️⃣ AJANTPHARM.NS (Healthcare) • Rating: STRONG BUY (92/100)
• Entry Setup: ₹3312.50 (Ceiling: ₹3329.06)
• Stop Loss: ₹3118.76 (Structural SL) | Target (2R): ₹3699.97
• Sizing (1.5% Risk): 7 shares (~₹23,188)
• Tech: RSI 45.0 | 20 & 200 EMA uptrend
3️⃣ TORNTPHARM.NS (Healthcare) • Rating: STRONG BUY (88/100)
• Entry Setup: ₹4668.80 (Ceiling: ₹4692.14)
• Stop Loss: ₹4492.23 (Structural SL) | Target (2R): ₹5021.94
• Sizing (1.5% Risk): 8 shares (~₹37,350)
• Tech: RSI 47.8 | 20 & 200 EMA uptrend
4️⃣ HCLTECH.NS (Technology) • Rating: STRONG BUY (89/100)
• Entry Setup: ₹1355.70 (Ceiling: ₹1362.48)
• Stop Loss: ₹1288.05 (Structural SL) | Target (2R): ₹1491.01
• Sizing (1.5% Risk): 22 shares (~₹29,825)
• Tech: RSI 46.6 | 20 & 200 EMA uptrend
5️⃣ MPHASIS.NS (Technology) • Rating: STRONG BUY (90/100)
• Entry Setup: ₹2445.00 (Ceiling: ₹2457.22)
• Stop Loss: ₹2286.95 (Structural SL) | Target (2R): ₹2761.10
• Sizing (1.5% Risk): 9 shares (~₹22,005)
• Tech: RSI 49.2 | 20 & 200 EMA uptrend
6️⃣ SAIL.NS (Metals) • Rating: BUY (82/100)
• Entry Setup: ₹171.31 (Ceiling: ₹172.17)
• Stop Loss: ₹160.72 (Structural SL) | Target (2R): ₹192.49
• Sizing (1.5% Risk): 141 shares (~₹24,155)
• Tech: RSI 50.0 | 20 & 200 EMA uptrend
7️⃣ HAL.NS (Capital Goods) • Rating: STRONG BUY (90/100)
• Entry Setup: ₹4727.00 (Ceiling: ₹4750.63)
• Stop Loss: ₹4492.89 (Structural SL) | Target (2R): ₹5195.22
• Sizing (1.5% Risk): 6 shares (~₹28,362)
• Tech: RSI 40.9 | 20 & 200 EMA uptrend"""

    result = parse_digest_message(sample)
    if result is None:
        print("FAIL: Parser returned None")
    else:
        print(f"Date: {result.date}")
        print(f"Market Regime: {result.market_regime}")
        print(f"Setups Found: {result.setups_found}")
        print(f"Stocks parsed: {len(result.stocks)}")
        print()
        for i, s in enumerate(result.stocks, 1):
            print(f"{i}. {s.symbol} ({s.sector})")
            print(f"   Rating: {s.rating} ({s.rating_score}/100)")
            print(f"   Entry: {s.entry_price} (Ceiling: {s.entry_ceiling})")
            print(f"   SL: {s.stop_loss} | Target: {s.target_price}")
            print(f"   Shares: {s.suggested_shares} (~₹{s.suggested_value})")
            print(f"   RSI: {s.rsi} | EMA: {s.ema_trend}")
            print()

        assert result.date == "2026-11-17", f"Expected '2026-11-17', got '{result.date}'"
        assert len(result.stocks) == 7, f"Expected 7 stocks, got {len(result.stocks)}"
        assert result.stocks[0].symbol == "CYIENT.NS"
        assert result.stocks[0].entry_price == 1086.10
        assert result.stocks[0].stop_loss == 1007.33
        assert result.stocks[0].target_price == 1243.64
        assert result.stocks[0].suggested_shares == 19
        assert result.stocks[5].symbol == "SAIL.NS"
        assert result.stocks[5].rating == "BUY"
        assert result.stocks[6].symbol == "HAL.NS"
        print("ALL ASSERTIONS PASSED ✅")

# Swing Trading Paper Trade Dashboard

A local paper trading dashboard and strategy verification engine for swing trading setups. Receives daily stock shortlists forwarded via Telegram, tracks real-time prices via Yahoo Finance, ignores repetitive signal noise, verifies entry conditions, and monitors swing performance with risk-adjusted metrics (R-Multiple, Win Rate, Expectancy, and Drawdown).

---

## Architecture Overview

```
Cloud Swing Engine
       │
       ▼ (Daily shortlists)
User Telegram App
       │
       ▼ (Forward message)
Telegram Bot (Local Long-Polling)
       │
       ▼
SQLite Database (aiosqlite) ◄──── Yahoo Finance Live Feed
       │
       ▼
FastAPI Backend (REST API)
       │
       ▼
React + Vite + TailwindCSS Dashboard (Dark Theme)
```

---

## Key Features

1. **Telegram Bot with Long Polling (100% Local)**:
   - Runs locally without requiring any public IP, ngrok, or webhook setup.
   - Long polling continuously checks Telegram servers for forwarded messages.
   - Automatically replies with receipt confirmation (e.g., `7 new trades added, 0 duplicates skipped`).

2. **Smart Noise & Repetition Filter**:
   - For consecutive days where the cloud engine suggests the same stocks, duplicate active positions are automatically filtered out.
   - Updates `last_signal_date` and increments `signal_count` (e.g. `x2`, `x3`) to show sustained institutional momentum.

3. **Entry Setup & Ceiling Verification**:
   - Immediately queries Yahoo Finance for current market price upon message arrival.
   - Verifies whether price met entry conditions (`price <= entry_ceiling`).

4. **Swing-Specific Metrics (Replaces misleading XIRR)**:
   - **R-Multiple**: Realized risk units gained/lost based on 1R (Entry - Stop Loss) and 2R Target.
   - **Win Rate (%)**: Percentage of trades reaching targets vs stopped out.
   - **Expectancy (₹)**: `(Win% × Avg Win) - (Loss% × Avg Loss)` — mathematical confirmation of edge.
   - **Holding Period**: Average duration held (days to weeks).
   - **Max Drawdown**: Peak-to-trough equity curve protection.

5. **TradingView-Grade Interactive Dashboard**:
   - Built with React, Vite, TailwindCSS, Recharts, and TradingView's Lightweight Charts.
   - Real-time price tracking with auto-refresh every 60 seconds.
   - Filterable & sortable trade ledger.
   - Price charts with horizontal lines for Entry (Blue), Stop Loss (Red), and 2R Target (Green).
   - Position exit modal supporting exit reasons (`TARGET_HIT`, `SL_HIT`, `MANUAL`, `EXPIRED`).

---

## Project Structure

```
swing-trading-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app with background bot & price loops
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLite schema & aiosqlite connector
│   │   ├── models.py            # Pydantic request & response schemas
│   │   ├── parser.py            # Telegram digest regex parser & unit tests
│   │   ├── telegram_bot.py      # python-telegram-bot long polling handler
│   │   ├── yahoo_finance.py     # yfinance live price fetcher & background refresher
│   │   ├── analytics.py         # R-multiple, win rate, expectancy, drawdown engine
│   │   └── routes/
│   │       ├── trades.py        # /api/trades (CRUD, active, ingest, close)
│   │       ├── analytics.py     # /api/analytics (summary, r-multiples, sector, returns)
│   │       └── prices.py        # /api/prices (live quote, manual refresh)
│   ├── venv/                    # Virtual environment
│   ├── requirements.txt         # Dependencies
│   └── run.py                   # Backend entrypoint (port 8000)
├── frontend/
│   ├── src/
│   │   ├── components/          # KPICard, TradeCard, TradeTable, PriceChart, etc.
│   │   ├── pages/               # Dashboard, Trades, TradeDetail, Analytics, Settings
│   │   ├── hooks/               # useTrades, useApi
│   │   ├── services/            # Axios API client
│   │   ├── utils/               # Currency (₹), date, and percentage formatters
│   │   ├── App.jsx              # Routing configuration
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js           # Vite dev server with /api proxy to localhost:8000
├── .env.example
└── README.md
```

---

## Quick Start Guide

### Option A: Run with Docker Compose (Recommended)

1. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
   Add your `TELEGRAM_BOT_TOKEN` and optional `TELEGRAM_CHAT_ID` to `.env`.

2. **Start Both Services**:
   ```bash
   docker compose up --build -d
   ```
   - **Frontend Dashboard**: `http://localhost:3000` (Nginx reverse-proxying `/api` to the backend)
   - **Backend API**: `http://localhost:8000` (Swagger docs at `/docs`)
   - **Persistent Database**: Stored in `./data/swing_trades.db` on your machine

3. **Stop Services**:
   ```bash
   docker compose down
   ```

---

### Option B: Run Locally Without Docker

#### 1. Configure Environment Variables

Edit `backend/.env` (or copy from `.env.example`):
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id   # (Optional) Restricts bot to only accept messages from you
DATABASE_PATH=./swing_trades.db
PRICE_REFRESH_INTERVAL=300       # Seconds between automated price refreshes
```

> **How to create your Telegram Bot in 2 minutes**:
> 1. Open Telegram and search for `@BotFather`.
> 2. Send `/newbot`, give it a name and username (e.g. `MySwingTrackerBot`).
> 3. Copy the token provided into `TELEGRAM_BOT_TOKEN` in `backend/.env`.
> 4. Search for your new bot in Telegram and click **Start**.
> 5. Forward your daily swing opportunity digests directly to this bot!

### 2. Run the Backend

```bash
cd backend
source venv/bin/activate
python run.py
```
Backend runs on `http://localhost:8000`. You can inspect interactive API documentation at `http://localhost:8000/docs`.

### 3. Run the Frontend

```bash
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## Direct Ingestion via API (Optional)

If you wish to test or feed digests without Telegram, use the direct ingestion endpoint:
```bash
curl -X POST http://localhost:8000/api/trades/ingest \
  -H "Content-Type: application/json" \
  -d '{"raw_message": "🎯 DAILY SWING OPPORTUNITIES DIGEST\n• Date: Tuesday, Nov 17, 2026\n• Market Regime: 🟢 Bullish (Nifty > 50 EMA)\n• Setups Found: 7 candidates...\n1️⃣ CYIENT.NS (Technology)..."}'
```

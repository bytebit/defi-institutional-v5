# DeFi Institutional v5

Institutional-grade multi-pool DeFi LP portfolio management system.

## Features

- Real on-chain Uniswap V3 position reading
- Subgraph pool data integration
- Portfolio allocation engine
- Risk engine
- Telegram alerts
- Semi-automatic transaction execution with manual confirmation
- Cloud deployment ready

## Installation

npm install

## Run

npm start

## Test Transaction Execution

npm run test:transaction

## Setup

Copy `.env.example` to `.env` and fill in your RPC + Telegram config.

### Configuration

- `RPC_URL` - Ethereum RPC endpoint
- `POOL_ADDRESS` - Uniswap V3 pool address
- `POSITION_ID` - LP position token ID
- `TG_BOT_TOKEN` - Telegram bot token (optional)
- `TG_CHAT_ID` - Telegram chat ID (optional)
- `MONITOR_INTERVAL` - Monitoring interval in milliseconds (default: 3600000)
- `PRIVATE_KEY` - Wallet private key for transaction execution (without 0x prefix)
- `AUTO_EXECUTE` - Enable automatic execution (true/false, default: false)

### Semi-Automatic Execution

When risk signals are detected (REDUCE), the system will:

1. Send Telegram alert
2. Prepare transaction details
3. **Ask for manual confirmation** (unless AUTO_EXECUTE=true)
4. Execute transaction if confirmed

The confirmation prompt will show:
- Operation type (reduce/increase position)
- Pool name
- Position details
- Estimated gas cost

You can cancel any transaction by answering "no" to the confirmation prompt.

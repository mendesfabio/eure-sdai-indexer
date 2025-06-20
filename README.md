# EURe/sDAI Indexer

A Ponder indexer that simulates what EURe/sDAI pool token balances would have been if the cache rate duration was properly set at creation.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment file and set RPC URL:

```bash
cp .env.example .env.local
```

3. Run indexer:

```bash
pnpm dev
```

## Environment Variables

- `PONDER_RPC_URL_100` - Gnosis Chain RPC URL

## TODO

- [ ] Treat add-remove and swap-remove as swaps in analysis
- [ ] Account for compounded effects on pool token balances

# EURe/sDAI Indexer

A Ponder indexer that analyzes the EURe/sDAI pool to simulate what token balances would have been if the cache rate duration had been properly configured at pool creation. This indexer tracks the difference between actual swap outcomes and what they would have been with fresh rate calculations.

## How It Works

The indexer processes every swap and compares actual outcomes with expected outcomes using fresh rates:

### For Each Swap:

1. **Fetch Current Rates**: Retrieve the latest rates from both sDAI and EURe rate providers
2. **Calculate Expected Output**: Using fresh rates, compute what the output should have been
3. **Compare Results**: Calculate the difference between actual output and expected output
4. **Accumulate Differences**: Track the total impact of cached rates over time

### Key Metrics Tracked:

- **`sdaiAccumulatedDelta`**: Total accumulated difference in sDAI tokens that would have been received with fresh rates
- **`eureAccumulatedDelta`**: Total accumulated difference in EURe tokens that would have been received with fresh rates

These accumulated deltas represent the total amount of tokens that users would have received differently if the pool had been using fresh rates instead of cached rates.

## Important Notes

- **Exact In Simulation**: For simulation purposes, we assume all swaps are exact-in when computing expected amounts, meaning users specify input and receive pool-determined output
- **Fixed Analysis Period**: This indexer is designed to run over a specific block range - from pool creation until the cache duration was fixed (more info at `ponder.config.ts`)
- **Post-Fix Behavior**: After the cache duration was corrected, running the indexer doesn't provide meaningful results since actual vs expected swap outcomes would be zero

## Setup

### Prerequisites

- Node.js and pnpm installed
- Access to a Gnosis Chain RPC endpoint

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` and set your RPC URL:

```bash
PONDER_RPC_URL_100=your_gnosis_chain_rpc_url_here
```

4. Run the indexer:

```bash
pnpm dev
```

## Environment Variables

| Variable             | Description          | Required |
| -------------------- | -------------------- | -------- |
| `PONDER_RPC_URL_100` | Gnosis Chain RPC URL | Yes      |

## Querying Results

Once the indexer has finished processing, you can query the results through the GraphQL interface (typically available at `http://localhost:42069/graphql`).

### Sample Query

```graphql
{
  pools {
    items {
      eureAccumulatedDelta
      sdaiAccumulatedDelta
    }
  }
}
```

### Final Results

```json
{
  "data": {
    "pools": {
      "items": [
        {
          "eureAccumulatedDelta": "-113099684040692199774575",
          "sdaiAccumulatedDelta": "-167690040229362169482275"
        }
      ]
    }
  }
}
```

### Interpreting Results

The accumulated deltas represent the net difference between the expected swap outputs (calculated with fresh rates) and the actual on-chain swap outputs. The results are from the perspective of the pool/LPs.

To convert the results to human-readable values, divide by 10^18:

- **EURe Impact**: -113,099.68 EURe
- **sDAI Impact**: -167,690.04 sDAI

A **negative** accumulated delta indicates that traders, in aggregate, received **more** tokens from the pool than they would have with fresh rates. This represents a net loss for Liquidity Providers (LPs).

## Disclaimer

This code is provided as-is for analysis purposes.

Please review the code thoroughly before use and verify all results independently.

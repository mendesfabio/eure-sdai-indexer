# EURe/sDAI Pool Analysis Indexer

A Ponder indexer that analyzes the EURe/sDAI pool to simulate token balances if cache rate duration had been properly configured at pool creation. Tracks the difference between actual swap outcomes and expected outcomes using fresh rate calculations.

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
- **Indirect Swaps**: This indexer does not handle indirect swaps (token → BPT → token) due to complexity. These represent <0.1% of total swaps (<300 out of 330k+ transactions) and are primarily CoW solver operations where rate extraction is not intentional. See [Dune query](https://dune.com/queries/5332599) for indirect swap examples

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

### Results Interpretation

The accumulated deltas represent the net difference between expected swap outputs (calculated with fresh rates) and actual on-chain swap outputs, from the pool/LPs perspective.

To convert to human-readable values, divide by 10^18:

- **EURe Impact**: -113,099.68 EURe
- **sDAI Impact**: -167,690.04 sDAI

A **negative** accumulated delta indicates that traders, in aggregate, received **more** tokens from the pool than they would have with fresh rates. This represents a net loss for Liquidity Providers (LPs).

## Disclaimer

This code is provided as-is for analysis purposes.

Please review the code thoroughly before use and verify all results independently.

## Schema & Documentation

The indexer tracks three main data types:

### `pool` Table

Tracks the current state of the EURe/sDAI pool and accumulated deltas.

| Field                  | Type     | Description                                                      |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `id`                   | `text`   | Pool ID (primary key)                                            |
| `eureBalance`          | `bigint` | Current EURe balance in the pool                                 |
| `sdaiBalance`          | `bigint` | Current sDAI balance in the pool                                 |
| `lastUpdatedBlock`     | `bigint` | Last block where pool was updated                                |
| `lastUpdatedTimestamp` | `bigint` | Last timestamp when pool was updated                             |
| `eureAccumulatedDelta` | `bigint` | Total accumulated difference in EURe tokens (expected vs actual) |
| `sdaiAccumulatedDelta` | `bigint` | Total accumulated difference in sDAI tokens (expected vs actual) |

### `swap` Table

Records every swap with expected vs actual outcomes.

| Field               | Type     | Description                                          |
| ------------------- | -------- | ---------------------------------------------------- |
| `id`                | `text`   | Unique event ID (tx hash + log index)                |
| `poolId`            | `text`   | Pool ID where swap occurred                          |
| `tokenIn`           | `text`   | Address of input token                               |
| `tokenOut`          | `text`   | Address of output token                              |
| `amountIn`          | `bigint` | Amount of tokens input                               |
| `amountOut`         | `bigint` | Actual amount of tokens output                       |
| `amountOutExpected` | `bigint` | Expected amount output (calculated with fresh rates) |
| `amountOutDelta`    | `bigint` | Difference between expected and actual output        |
| `eureBalance`       | `bigint` | Pool EURe balance after swap                         |
| `sdaiBalance`       | `bigint` | Pool sDAI balance after swap                         |
| `eureRate`          | `bigint` | EURe rate used in calculation                        |
| `sdaiRate`          | `bigint` | sDAI rate used in calculation                        |
| `blockNumber`       | `bigint` | Block number of swap                                 |
| `blockTimestamp`    | `bigint` | Timestamp of swap                                    |
| `transactionHash`   | `text`   | Transaction hash                                     |

### `poolBalanceChanged` Table

Records pool balance changes from add/remove liquidity.

| Field             | Type       | Description                           |
| ----------------- | ---------- | ------------------------------------- |
| `id`              | `text`     | Unique event ID (tx hash + log index) |
| `poolId`          | `text`     | Pool ID where balance changed         |
| `tokens`          | `text[]`   | Array of token addresses              |
| `deltas`          | `bigint[]` | Array of balance changes              |
| `eureBalance`     | `bigint`   | Pool EURe balance after change        |
| `sdaiBalance`     | `bigint`   | Pool sDAI balance after change        |
| `blockNumber`     | `bigint`   | Block number of event                 |
| `blockTimestamp`  | `bigint`   | Timestamp of event                    |
| `transactionHash` | `text`     | Transaction hash                      |

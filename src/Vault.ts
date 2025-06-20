import { ponder } from "ponder:registry";
import { pool, swapEvent, poolBalanceChangedEvent } from "ponder:schema";

import { SDAI, EURE } from "./utils/constants";
import { computeOutGivenExactInWithRates } from "./utils/swap";

const POOL_ID =
  "0xdd439304a77f54b1f7854751ac1169b279591ef7000000000000000000000064";

ponder.on("Vault:PoolRegistered", async ({ event, context }) => {
  const { poolId } = event.args;

  if (poolId !== POOL_ID) return;

  await context.db.insert(pool).values({
    id: poolId,
    eureBalance: 0n,
    sdaiBalance: 0n,
    lastUpdatedBlock: event.block.number,
    lastUpdatedTimestamp: event.block.timestamp,
    accumulatedSdaiDelta: 0n,
    accumulatedEureDelta: 0n,
  });
});

ponder.on("Vault:Swap", async ({ event, context }) => {
  const { poolId, tokenIn, tokenOut, amountIn, amountOut } = event.args;

  if (poolId !== POOL_ID) return;

  const currentBalance = await context.db.find(pool, { id: poolId });

  let sdaiBalance = currentBalance?.sdaiBalance || 0n;
  let eureBalance = currentBalance?.eureBalance || 0n;
  let sdaiAccumulatedDelta = currentBalance?.sdaiAccumulatedDelta || 0n;
  let eureAccumulatedDelta = currentBalance?.eureAccumulatedDelta || 0n;

  let expectedOutput = 0n;
  let deltaAmountOut = 0n;

  // Only compute delta if both tokens are EURe/sDAI (excludes add-swap and remove-swap)
  if (
    (tokenIn === SDAI || tokenIn === EURE) &&
    (tokenOut === SDAI || tokenOut === EURE)
  ) {
    // Compute expected output using non-cached rate-scaled balances
    expectedOutput = await computeOutGivenExactInWithRates(
      context,
      tokenIn,
      tokenOut,
      amountIn,
      sdaiBalance,
      eureBalance
    );

    deltaAmountOut = expectedOutput - amountOut;

    if (tokenOut === SDAI) {
      sdaiAccumulatedDelta += deltaAmountOut;
    } else if (tokenOut === EURE) {
      eureAccumulatedDelta += deltaAmountOut;
    }
  }

  if (tokenIn === SDAI) {
    sdaiBalance += amountIn;
  } else if (tokenIn === EURE) {
    eureBalance += amountIn;
  }

  if (tokenOut === SDAI) {
    sdaiBalance -= amountOut;
  } else if (tokenOut === EURE) {
    eureBalance -= amountOut;
  }

  await context.db.insert(swapEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    poolId,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    expectedOutput,
    deltaAmountOut,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  await context.db.update(pool, { id: poolId }).set({
    sdaiBalance,
    eureBalance,
    lastUpdatedBlock: event.block.number,
    lastUpdatedTimestamp: event.block.timestamp,
    sdaiAccumulatedDelta,
    eureAccumulatedDelta,
  });
});

ponder.on("Vault:PoolBalanceChanged", async ({ event, context }) => {
  const { poolId, tokens, deltas } = event.args;

  if (poolId !== POOL_ID) return;

  const sdaiIndex = tokens.findIndex((token) => token === SDAI);
  const eureIndex = tokens.findIndex((token) => token === EURE);

  if (sdaiIndex === -1 && eureIndex === -1) return;

  const currentBalance = await context.db.find(pool, { id: poolId });

  let sdaiBalance = currentBalance?.sdaiBalance || 0n;
  let eureBalance = currentBalance?.eureBalance || 0n;

  if (sdaiIndex !== -1) {
    sdaiBalance += deltas[sdaiIndex] || 0n;
  }
  if (eureIndex !== -1) {
    eureBalance += deltas[eureIndex] || 0n;
  }

  await context.db.insert(poolBalanceChangedEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    poolId,
    tokens: [...tokens],
    deltas: [...deltas],
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  await context.db.update(pool, { id: poolId }).set({
    sdaiBalance,
    eureBalance,
    lastUpdatedBlock: event.block.number,
    lastUpdatedTimestamp: event.block.timestamp,
  });
});

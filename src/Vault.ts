import { ponder } from "ponder:registry";
import { pool, swapEvent, poolBalanceChangedEvent } from "ponder:schema";

import {
  SDAI,
  EURE,
  SDAI_RATE_PROVIDER,
  EURE_RATE_PROVIDER,
} from "./utils/const";
import { computeOutGivenExactInWithRates } from "./utils/swap";
import { RateProviderAbi } from "../abis/RateProviderAbi";

ponder.on("Vault:PoolRegistered", async ({ event, context }) => {
  await context.db.insert(pool).values({
    id: event.args.poolId,
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

  const currentBalance = await context.db.find(pool, { id: poolId });

  let sdaiBalance = currentBalance?.sdaiBalance || 0n;
  let eureBalance = currentBalance?.eureBalance || 0n;
  let sdaiAccumulatedDelta = currentBalance?.sdaiAccumulatedDelta || 0n;
  let eureAccumulatedDelta = currentBalance?.eureAccumulatedDelta || 0n;

  let expectedOutput = 0n;
  let deltaAmountOut = 0n;

  const sdaiRate = await context.client.readContract({
    abi: RateProviderAbi,
    address: SDAI_RATE_PROVIDER,
    functionName: "getRate",
  });

  const eureRate = await context.client.readContract({
    abi: RateProviderAbi,
    address: EURE_RATE_PROVIDER,
    functionName: "getRate",
  });

  if (
    (tokenIn === SDAI || tokenIn === EURE) &&
    (tokenOut === SDAI || tokenOut === EURE)
  ) {
    expectedOutput = await computeOutGivenExactInWithRates(
      tokenIn,
      tokenOut,
      amountIn,
      sdaiBalance,
      eureBalance,
      sdaiRate,
      eureRate
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
    amountOutExpected: expectedOutput,
    amountOutDelta: deltaAmountOut,
    sdaiBalance,
    eureBalance,
    sdaiRate,
    eureRate,
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
    sdaiBalance,
    eureBalance,
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

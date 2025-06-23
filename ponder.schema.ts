import { onchainTable } from "ponder";

export const pool = onchainTable("pool", (t) => ({
  id: t.text().primaryKey(),
  eureBalance: t.bigint(),
  sdaiBalance: t.bigint(),
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.bigint(),
  eureAccumulatedDelta: t.bigint(),
  sdaiAccumulatedDelta: t.bigint(),
}));

export const swapEvent = onchainTable("swap", (t) => ({
  id: t.text().primaryKey(),
  poolId: t.text(),
  tokenIn: t.text(),
  tokenOut: t.text(),
  amountIn: t.bigint(),
  amountOut: t.bigint(),
  amountOutExpected: t.bigint(),
  amountOutDelta: t.bigint(),
  eureBalance: t.bigint(),
  sdaiBalance: t.bigint(),
  eureRate: t.bigint(),
  sdaiRate: t.bigint(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionHash: t.text(),
}));

export const poolBalanceChangedEvent = onchainTable(
  "poolBalanceChanged",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.text(),
    tokens: t.text().array(),
    deltas: t.bigint().array(),
    eureBalance: t.bigint(),
    sdaiBalance: t.bigint(),
    blockNumber: t.bigint(),
    blockTimestamp: t.bigint(),
    transactionHash: t.text(),
  })
);

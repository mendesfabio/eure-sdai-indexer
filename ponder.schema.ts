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

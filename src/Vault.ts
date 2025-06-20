import { ponder } from "ponder:registry";
import { pool } from "ponder:schema";
import { _computeOutGivenExactIn, _computeInvariant } from "./utils/stable";
import { RateProviderAbi } from "../abis/RateProviderAbi";

const SDAI = "0xaf204776c7245bF4147c2612BF6e5972Ee483701";
const EURE = "0xcB444e90D8198415266c6a2724b7900fb12FC56E";

const SDAI_RATE_PROVIDER = "0x89C80A4540A00b5270347E02e2E144c71da2EceD";
const EURE_RATE_PROVIDER = "0xE7511f6e5C593007eA8A7F52af4B066333765e03";

const POOL_ID =
  "0xdd439304a77f54b1f7854751ac1169b279591ef7000000000000000000000064";

const AMP = 1000000n;

async function computeOutGivenExactInWithRates(
  context: any,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  sdaiBalance: bigint,
  eureBalance: bigint
): Promise<bigint> {
  const sdaiRate = await context.contracts.read({
    address: SDAI_RATE_PROVIDER,
    abi: RateProviderAbi,
    functionName: "getRate",
  });

  const eureRate = await context.contracts.read({
    address: EURE_RATE_PROVIDER,
    abi: RateProviderAbi,
    functionName: "getRate",
  });

  const WAD = BigInt(10 ** 18);
  const scaledSdaiBalance = (sdaiBalance * sdaiRate) / WAD;
  const scaledEureBalance = (eureBalance * eureRate) / WAD;

  const tokenIndexIn = tokenIn === SDAI ? 0 : 1;
  const tokenIndexOut = tokenOut === SDAI ? 0 : 1;

  const inputRate = tokenIn === SDAI ? sdaiRate : eureRate;
  const scaledAmountIn = (amountIn * inputRate) / WAD;

  const balances = [scaledSdaiBalance, scaledEureBalance];

  const invariant = _computeInvariant(AMP, balances);

  const scaledOutput = _computeOutGivenExactIn(
    AMP,
    balances,
    tokenIndexIn,
    tokenIndexOut,
    scaledAmountIn,
    invariant
  );

  const outputRate = tokenOut === SDAI ? sdaiRate : eureRate;

  return (scaledOutput * WAD) / outputRate;
}

ponder.on("Vault:PoolRegistered", async ({ event, context }) => {
  const { poolId } = event.args;

  if (poolId !== POOL_ID) return;

  await context.db.insert(pool).values({
    id: poolId,
    eureBalance: 0n,
    sdaiBalance: 0n,
    lastUpdatedBlock: event.block.number,
    lastUpdatedTimestamp: event.block.timestamp,
    swapDelta: 0n,
    swapDeltaToken: "0x0000000000000000000000000000000000000000",
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

  // Compute expected output using non-cached rate-scaled balances
  const expectedOutput = await computeOutGivenExactInWithRates(
    context,
    tokenIn,
    tokenOut,
    amountIn,
    sdaiBalance,
    eureBalance
  );

  const delta =
    expectedOutput > amountOut
      ? expectedOutput - amountOut
      : amountOut - expectedOutput;

  if (tokenOut === SDAI) {
    sdaiAccumulatedDelta += delta;
  } else if (tokenOut === EURE) {
    eureAccumulatedDelta += delta;
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

  await context.db.update(pool, { id: poolId }).set({
    sdaiBalance,
    eureBalance,
    lastUpdatedBlock: event.block.number,
    lastUpdatedTimestamp: event.block.timestamp,
  });
});

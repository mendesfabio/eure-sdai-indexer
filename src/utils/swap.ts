import { SDAI, AMP } from "./const";
import { _computeOutGivenExactIn, _computeInvariant } from "./stable";

export async function computeOutGivenExactInWithRates(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  sdaiBalance: bigint,
  eureBalance: bigint,
  sdaiRate: bigint,
  eureRate: bigint
): Promise<bigint> {
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

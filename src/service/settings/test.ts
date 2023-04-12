import { Unit } from '@cfxjs/use-wallet-react/ethereum';

export const encodeSqrtRatioX96 = ({ amount1, amount0 }: { amount1: string | Unit; amount0: string | Unit }) => {
  const usedAmount1 = new Unit(amount1);
  const usedAmount0 = new Unit(amount0);
  const numerator = new Unit((BigInt(usedAmount1.toDecimalMinUnit()) << BigInt(192)).toString());
  const denominator = usedAmount0;
  const ratioX192 = numerator.div(denominator);
  return ratioX192.sqrt();
};

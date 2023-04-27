import { Unit } from '@cfxjs/use-wallet-react/ethereum';

// amountOutMinimum = (1/(1+s)) * amountOut
export const getAmountOutMinimumDecimal = (amountOut: string | Unit, slippage: number) => {
  return new Unit(amountOut).mul(new Unit(1).div(new Unit(1).add(slippage))).toDecimalMinUnit(0);
};

// amountInMaximum = (1+s)*amountIn
export const getAmountInMaximumDecimal = (amountIn: string | Unit, slippage: number) => {
  return new Unit(1).add(slippage).mul(amountIn).toDecimalMinUnit(0);
};

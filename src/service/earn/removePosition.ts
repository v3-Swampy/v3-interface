import { AutoPositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getDeadline, getSlippageTolerance, calcBurnAmountMinWithSlippage } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';
import showRemoveLiquidityModal from '@pages/Earn/RemoveLiquidity/RemoveLiquidityModal';
import { getPosition } from './positionDetail';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getPool } from '@service/pairs&pool';

export const handleSubmitRemoveLiquidity = async ({
  tokenId,
  removePercent,
  leftRemoveAmount,
  rightRemoveAmount,
  leftEarnedFees,
  rightEarnedFees,
}: {
  tokenId: string;
  removePercent: number;
  leftRemoveAmount: string;
  rightRemoveAmount: string;
  leftEarnedFees: string;
  rightEarnedFees: string;
}) => {
  const account = getAccount();
  const tokenIdNum = Number(tokenId);
  const position = getPosition(tokenIdNum);
  const { liquidity: positionLiquidity, unclaimedRewards } = position || {};
  if (!account || !tokenId || !position || !positionLiquidity) return '';

  const rewardTokens = (unclaimedRewards?.map((reward) => getWrapperTokenByAddress(reward.rewardTokenInfo?.address)?.address).filter(Boolean) as string[]) || [];

  const tokenIdHexString = new Unit(tokenId).toHexMinUnit();

  const liquidity = new Unit(positionLiquidity).mul(removePercent).div(100).toDecimalMinUnit(0);

  const pool = await getPool({ tokenA: position.token0, tokenB: position.token1, fee: position.fee });
  if (!pool?.sqrtPriceX96) return '';
  const { amount0Min, amount1Min } = calcBurnAmountMinWithSlippage(
    pool.sqrtPriceX96,
    getSlippageTolerance() ?? 0,
    position.tickLower,
    position.tickUpper,
    liquidity
  );

  const data = AutoPositionManager.func.interface.encodeFunctionData('decreaseLiquidity', [
    {
      tokenId: tokenIdHexString,
      liquidity: new Unit(liquidity).toHexMinUnit(),
      amount0Min: new Unit(amount0Min).toHexMinUnit(),
      amount1Min: new Unit(amount1Min).toHexMinUnit(),
      deadline: getDeadline(),
    },
    rewardTokens,
  ]);

  const transactionParams = {
    data,
    to: AutoPositionManager.address,
  }

  const recordParams = {
    type: 'Position_RemoveLiquidity',
    positionId: `${tokenId}`,
  } as const;

  showRemoveLiquidityModal({
    transactionParams,
    recordParams,
    tokenId,
    leftRemoveAmount,
    rightRemoveAmount,
    leftEarnedFees,
    rightEarnedFees,
  });
};

export const handleSendTransaction = async (transactionParams: { to: string; data: string; }) => await sendTransaction(transactionParams);

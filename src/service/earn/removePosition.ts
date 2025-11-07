import { AutoPositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getDeadline } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';
import showRemoveLiquidityModal from '@pages/Earn/RemoveLiquidity/RemoveLiquidityModal';
import { getPosition } from './positionDetail';

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
  const { liquidity: positionLiquidity, token0, token1 } = position || {};
  if (!account || !tokenId || !token0 || !token1 || !positionLiquidity) return '';

  const tokenIdHexString = new Unit(tokenId).toHexMinUnit();

  const liquidity = new Unit(positionLiquidity).mul(removePercent).div(100).toDecimalMinUnit(0);

  const data = AutoPositionManager.func.interface.encodeFunctionData('decreaseLiquidity', [
    {
      tokenId: tokenIdHexString,
      liquidity: new Unit(liquidity).toHexMinUnit(),
      amount0Min: 0,
      amount1Min: 0,
      deadline: getDeadline(),
    },
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

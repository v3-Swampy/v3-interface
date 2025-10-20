import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getDeadline } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';
import showRemoveLiquidityModal from '@pages/Pool/RemoveLiquidity/RemoveLiquidityModal';
import { getPosition, MAX_UINT128 } from './positionDetail';
import { ZeroAddress } from '@service/swap';

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

  const data0 = NonfungiblePositionManager.func.interface.encodeFunctionData('decreaseLiquidity', [
    {
      tokenId: tokenIdHexString,
      liquidity: new Unit(liquidity).toHexMinUnit(),
      amount0Min: 0,
      amount1Min: 0,
      deadline: getDeadline(),
    },
  ]);
  const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';
  const data1 = NonfungiblePositionManager.func.interface.encodeFunctionData('collect', [
    {
      tokenId: tokenIdHexString,
      recipient: hasWCFX ? ZeroAddress : account, // some tokens might fail if transferred to address(0)
      amount0Max: MAX_UINT128.toHexMinUnit(),
      amount1Max: MAX_UINT128.toHexMinUnit(),
    },
  ]);
  const data2 = NonfungiblePositionManager.func.interface.encodeFunctionData('unwrapWETH9', [0, account]);

  const data3 = NonfungiblePositionManager.func.interface.encodeFunctionData('sweepToken', [token0.symbol === 'WCFX' ? token1.address : token0.address, 0, account]);

  const transactionParams = {
    data: NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [hasWCFX ? [data0, data1, data2, data3] : [data0, data1]]),
    to: NonfungiblePositionManager.address,
  }

  const recordParams = {
    type: 'Position_RemoveLiquidity',
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

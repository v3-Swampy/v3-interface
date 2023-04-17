import dayjs from 'dayjs';
import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getTransactionDeadline } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';
import showRemoveLiquidityModal from '@pages/Pool/RemoveLiquidity/RemoveLiquidityModal';

const duration = dayjs.duration;

export const handleSubmitRemoveLiquidity = async ({
  tokenId,
  positionLiquidity,
  removePercent,
  leftRemoveAmount,
  rightRemoveAmount,
  leftEarnedFees,
  rightEarnedFees,
}: {
  tokenId: string;
  positionLiquidity: string;
  removePercent: number;
  leftRemoveAmount: string;
  rightRemoveAmount: string;
  leftEarnedFees: string;
  rightEarnedFees: string;
}) => {
  const account = getAccount();
  if (!account) return '';
  const deadline = dayjs().add(duration(getTransactionDeadline(), 'minute')).unix();
  const liquidity = new Unit(positionLiquidity).mul(removePercent).div(100).toDecimalMinUnit(0);

  const params = {
    tokenId: new Unit(tokenId).toHexMinUnit(),
    liquidity: new Unit(liquidity).toHexMinUnit(),
    amount0Min: 0,
    amount1Min: 0,
    deadline,
  };
  const data = NonfungiblePositionManager.func.interface.encodeFunctionData('decreaseLiquidity', [
    {
      ...params,
    },
  ]);

  const transcationParams = { value: '0x0', to: NonfungiblePositionManager.address, data };

  const recordParams = {
    type: 'Position_RemoveLiquidity',
  } as const;

  showRemoveLiquidityModal({
    transcationParams,
    recordParams,
    tokenId,
    leftRemoveAmount,
    rightRemoveAmount,
    leftEarnedFees,
    rightEarnedFees,
  });
};

export const handleSendTransaction = async (transcationParams: { to: string; data: string; value: string }) => await sendTransaction(transcationParams);

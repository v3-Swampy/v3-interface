import dayjs from 'dayjs';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getTransactionDeadline } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';
import { showToast } from '@components/showPopup';
import { toI18n } from '@hooks/useI18n';

const transitions = {
  en: {
    success_tip: 'Remove Successfully!',
    error_tip: 'Unknown Error',
  },
  zh: {
    success_tip: 'Remove Successfully!',
    error_tip: 'Unknown Error',
  },
} as const;

const duration = dayjs.duration;

export const removeLiquidity = async ({ tokenId, positionLiquidity, removePercent }: { tokenId: string; positionLiquidity: string; removePercent: number }) => {
  const i18n = toI18n(transitions);
  try {
    const account = getAccount();
    if (!account) return;
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
    const txHash = await sendTransaction({ value: '0x0', to: NonfungiblePositionManager.address, data });
    const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
    await receiptPromise;
    showToast(i18n.success_tip, {
      type: 'success',
    });
  } catch (err: any) {
    showToast(err?.message || i18n.success_tip, {
      type: 'warning',
    });
  }
};

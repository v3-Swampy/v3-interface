import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { sendTransaction } from '@service/account';
import { UniswapV3Factory } from '@contracts/index';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { showToast } from '@components/showPopup';
import { toI18n, compiled } from '@hooks/useI18n';
import { getSourceToken, getDestinationToken } from './tokenSelect';

const transitions = {
  en: {
    success_tip: 'Swap {sourceTokenAmount} {sourceToken} to {destinationTokenAmount} {destinationToken} success!',
  },
  zh: {
    success_tip: '兑换 {sourceTokenAmount} {sourceToken} 成 {destinationTokenAmount} {destinationToken} 成功!',
  },
} as const;

export const handleSwap = async ({ sourceTokenAmount, destinationTokenAmount }: { sourceTokenAmount: string; destinationTokenAmount: string }) => {
  const i18n = toI18n(transitions);
  const sourceToken = getSourceToken();
  const destinationToken = getDestinationToken();
  if (!sourceToken || !destinationToken || !sourceTokenAmount || !destinationTokenAmount) return;

  const hexSourceTokenAmount = Unit.fromStandardUnit(sourceTokenAmount, sourceToken.decimals).toHexMinUnit();
  const hexDestinationTokenAmount = Unit.fromStandardUnit(destinationTokenAmount, destinationToken.decimals).toHexMinUnit();

  const txHash = await sendTransaction({
    data: UniswapV3Factory.func.encodeFunctionData('demo', [hexSourceTokenAmount, hexDestinationTokenAmount]),
    to: UniswapV3Factory.address,
  });

  const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
  await receiptPromise;

  showToast(compiled(i18n.success_tip, { sourceTokenAmount, destinationTokenAmount, sourceToken: sourceToken.symbol, destinationToken: destinationToken.symbol }), {
    type: 'success',
  });
};

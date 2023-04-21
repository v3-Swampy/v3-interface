import { sendTransaction } from '@service/account';
import { UniswapV3SwapRouter } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { showToast } from '@components/showPopup';
import { toI18n, compiled } from '@hooks/useI18n';
import { TradeType, type useBestTrade } from '@service/pairs&pool';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippageTolerance } from '@service/settings';
import { getAccount } from '@service/account';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getSourceToken, getDestinationToken } from './tokenSelect';

const transitions = {
  en: {
    success_tip: 'Swap {sourceTokenAmount} {sourceToken} to {destinationTokenAmount} {destinationToken} success!',
  },
  zh: {
    success_tip: '兑换 {sourceTokenAmount} {sourceToken} 成 {destinationTokenAmount} {destinationToken} 成功!',
  },
} as const;

export const handleSwap = async ({
  sourceTokenAmount,
  destinationTokenAmount,
  bestTrade,
}: {
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  bestTrade: ReturnType<typeof useBestTrade>;
}) => {
  const i18n = toI18n(transitions);
  const sourceToken = getSourceToken();
  const sourceTokenWrapper = getWrapperTokenByAddress(sourceToken?.address);
  const destinationToken = getDestinationToken();
  const destinationTokenWrpper = getWrapperTokenByAddress(destinationToken?.address);
  const account = getAccount();
  if (!sourceTokenWrapper || !destinationTokenWrpper || !sourceTokenAmount || !destinationTokenAmount || !bestTrade?.trade || !account || !sourceToken || !destinationToken) return;

  const hexSourceTokenAmount = Unit.fromStandardUnit(sourceTokenAmount, sourceToken.decimals).toHexMinUnit();
  const hexDestinationTokenAmount = Unit.fromStandardUnit(destinationTokenAmount, destinationToken.decimals).toHexMinUnit();

  const { route, tradeType } = bestTrade.trade;
  const singleHop = route.length === 1;
  let tradeTypeFunctionName: 'exactInputSingle' | 'exactOutputSingle' | 'quoteExactInput' | 'quoteExactOutput';
  if (singleHop) {
    tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'exactInputSingle' : 'exactOutputSingle';
  } else {
    tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInput' : 'quoteExactOutput';
  }
  console.log(route, route[0])
  console.log(tradeTypeFunctionName)
  const params = {}
  if (singleHop) {
    Object.assign(params, {
      tokenIn: sourceTokenWrapper.address,
      tokenOut: destinationTokenWrpper.address,
      fee: route[0].fee,
      recipient: account,
      deadline: getDeadline(),
      amountIn: Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit(),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    });
  } else {
    Object.assign(params, {

    });
  }

  const isSourceTokenCfx = sourceToken?.address === 'CFX';

  const txHash = await sendTransaction({
    value: isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit() : '0x0',
    data: UniswapV3SwapRouter.func.interface.encodeFunctionData(tradeTypeFunctionName, [params]),
    to: UniswapV3SwapRouter.address,
  });

  const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
  await receiptPromise;

  showToast(compiled(i18n.success_tip, { sourceTokenAmount, destinationTokenAmount, sourceToken: sourceToken.symbol!, destinationToken: destinationToken.symbol! }), {
    type: 'success',
  });
};

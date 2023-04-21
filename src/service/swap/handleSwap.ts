import { sendTransaction } from '@service/account';
import { UniswapV3SwapRouter } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { pack } from '@ethersproject/solidity';
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

  const { route, tradeType } = bestTrade.trade;
  if (!route.length) return;
  const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'exactInput' : 'exactInput';
  const path = route.reduce((pre, cur) => pre.concat(cur.fee, cur.tokenOut.address), [route.at(0)?.tokenIn.address] as Array<string>);
  const types = Array.from({ length: path.length }, (_, index) => (index % 2 === 1 ? 'uint24' : 'address'));
  console.log(tradeTypeFunctionName);
  console.log(route);
  console.log({
    path: pack(types, path),
    recipient: account,
    deadline: getDeadline(),
    amountIn: Unit.fromMinUnit(route.at(-1)?.amountIn!).toHexMinUnit(),
    amountOutMinimum: 0,
  });

  const params = {
    path: pack(types, path),
    recipient: account,
    deadline: getDeadline(),
  };

  if (tradeTypeFunctionName === 'exactInput') {
    Object.assign(params, {
      amountIn: Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit(),
      amountOutMinimum: 0,
    });
  } else {
    Object.assign(params, {
      amountOut: Unit.fromStandardUnit(destinationTokenAmount, destinationTokenWrpper.decimals).toHexMinUnit(),
      amountInMaximum: 0,
    });
  }

  const isSourceTokenCfx = sourceToken?.address === 'CFX';
  const isDestinationTokenTokenCfx = destinationToken?.address === 'CFX';

  const data0 = UniswapV3SwapRouter.func.interface.encodeFunctionData(tradeTypeFunctionName, [params]);
  const data1 = UniswapV3SwapRouter.func.interface.encodeFunctionData('unwrapWETH9', [
    isDestinationTokenTokenCfx ? 0 : 0,
    account,
  ]);

  const txHash = await sendTransaction({
    value: isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit() : '0x0',
    data: UniswapV3SwapRouter.func.interface.encodeFunctionData('multicall', [isDestinationTokenTokenCfx ? [data0, data1] : [data0]]),
    to: UniswapV3SwapRouter.address,
  });

  const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
  await receiptPromise;

  showToast(compiled(i18n.success_tip, { sourceTokenAmount, destinationTokenAmount, sourceToken: sourceToken.symbol!, destinationToken: destinationToken.symbol! }), {
    type: 'success',
  });
};

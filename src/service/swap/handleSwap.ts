import { sendTransaction } from '@service/account';
import { UniswapV3SwapRouter } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { pack } from '@ethersproject/solidity';
import { TradeType, type useBestTrade } from '@service/pairs&pool';
import { getDeadline } from '@service/settings';
import { getAccount } from '@service/account';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getSourceToken, getDestinationToken } from './tokenSelect';
import showStakeConfirmModal from '@pages/Swap/ConfirmModal';


export const handleConfirmSwap = async ({
  sourceTokenAmount,
  destinationTokenAmount,
  bestTrade,
  sourceTokenUSDPrice,
  destinationTokenUSDPrice
}: {
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  bestTrade: ReturnType<typeof useBestTrade>;
  sourceTokenUSDPrice: string | null | undefined;
  destinationTokenUSDPrice: string | null | undefined;
}) => {
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
    isDestinationTokenTokenCfx ? Unit.fromStandardUnit(destinationTokenAmount, destinationTokenWrpper.decimals).toHexMinUnit() : 0,
    account,
  ]);


  const transactionParams = {
    value: isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit() : '0x0',
    data: UniswapV3SwapRouter.func.interface.encodeFunctionData('multicall', [isDestinationTokenTokenCfx ? [data0, data1] : [data0]]),
    to: UniswapV3SwapRouter.address,
  }

  const recordParams = {
    type: 'Swap',
    tokenA_Address: sourceToken.address,
    tokenA_Value: Unit.fromStandardUnit(sourceTokenAmount, sourceToken.decimals).toDecimalStandardUnit(5),
    tokenB_Address: destinationToken.address,
    tokenB_Value: Unit.fromStandardUnit(destinationTokenAmount, destinationToken.decimals).toDecimalStandardUnit(5),
  } as const;

  showStakeConfirmModal({
    sourceToken,
    destinationToken,
    sourceTokenAmount,
    destinationTokenAmount,
    sourceTokenUSDPrice,
    destinationTokenUSDPrice,
    bestTrade,
    transactionParams,
    recordParams
  });
};

export const handleSwap = async (transactionParams: { to: string; data: string; value: string }) => {
  const txHash = await sendTransaction(transactionParams);
  return txHash;
};

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

export const ZeroAddress = '0x0000000000000000000000000000000000000000';
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
  const isSourceTokenCfx = sourceToken?.address === 'CFX';
  const isDestinationTokenTokenCfx = destinationToken?.address === 'CFX';
  const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'exactInput' : 'exactOutput';

  const data0 = route.map(oneRoute => {
    const path = oneRoute.reduce((pre, cur) => pre.concat(cur.fee, cur.tokenOut.address), [oneRoute.at(0)?.tokenIn.address] as Array<string>);
    const types = Array.from({ length: path.length }, (_, index) => (index % 2 === 1 ? 'uint24' : 'address'));
  
 
    const params = {
      path: pack(types, path),
      recipient: isDestinationTokenTokenCfx ? ZeroAddress : account,
      deadline: getDeadline(),
    };
  
    if (tradeTypeFunctionName === 'exactInput') {
      console.log(oneRoute.at(0)?.amountIn ?? '0', Unit.fromMinUnit(oneRoute.at(0)?.amountIn ?? '0').toDecimalStandardUnit(5, sourceToken.decimals))
      Object.assign(params, {
        amountIn: Unit.fromMinUnit(oneRoute.at(0)?.amountIn ?? '0').toHexMinUnit(),
        amountOutMinimum: 0,
      });
    } else {
      console.log(oneRoute.at(-1)?.amountOut ?? '0', Unit.fromMinUnit(oneRoute.at(-1)?.amountOut ?? '0').toDecimalStandardUnit(5, destinationToken.decimals))
      Object.assign(params, {
        amountOut: Unit.fromMinUnit(oneRoute.at(-1)?.amountOut ?? '0').toHexMinUnit(),
        amountInMaximum: 0,
      });
    }

    const data = UniswapV3SwapRouter.func.interface.encodeFunctionData(tradeTypeFunctionName, [params]);
    return data;
  });

  const data1 = UniswapV3SwapRouter.func.interface.encodeFunctionData('unwrapWETH9', [
    isDestinationTokenTokenCfx ? 0 : 0,
    account,
  ]);
  console.log([isDestinationTokenTokenCfx ? [...data0, data1] : [...data0]])
  console.log(isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toDecimalStandardUnit(5) : '0x0')

  const transactionParams = {
    value: isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit() : '0x0',
    data: UniswapV3SwapRouter.func.interface.encodeFunctionData('multicall', [isDestinationTokenTokenCfx ? [...data0, data1] : [...data0]]),
    to: UniswapV3SwapRouter.address,
  }
  console.log(transactionParams);

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

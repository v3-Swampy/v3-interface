import { sendTransaction } from '@service/account';
import { UniswapV3SwapRouter } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { pack } from '@ethersproject/solidity';
import { TradeType, type useBestTrade } from '@service/pairs&pool';
import { getDeadline, getSlippageTolerance } from '@service/settings';
import { getAccount } from '@service/account';
import { addRecordToHistory } from '@service/history';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAmountOutMinimumDecimal, getAmountInMaximumDecimal } from '@utils/slippage';
import { getSourceToken, getDestinationToken } from './tokenSelect';

export const ZeroAddress = '0x0000000000000000000000000000000000000000';
export const handleSwap = async ({
  sourceTokenAmount,
  destinationTokenAmount,
  bestTrade,
  onSuccess,
}: {
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  bestTrade: ReturnType<typeof useBestTrade>;
  onSuccess: VoidFunction;
}) => {
  const sourceToken = getSourceToken();
  const sourceTokenWrapper = getWrapperTokenByAddress(sourceToken?.address);
  const destinationToken = getDestinationToken();
  const destinationTokenWrpper = getWrapperTokenByAddress(destinationToken?.address);
  const account = getAccount();
  const slippage = getSlippageTolerance() || 0;
  if (!sourceTokenWrapper || !destinationTokenWrpper || !sourceTokenAmount || !destinationTokenAmount || !bestTrade?.trade || !account || !sourceToken || !destinationToken)
    return '';

  const { route, tradeType } = bestTrade.trade;
  if (!route.length) return '';
  const isSourceTokenCfx = sourceToken?.address === 'CFX';
  const isDestinationTokenTokenCfx = destinationToken?.address === 'CFX';
  const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'exactInput' : 'exactOutput';

  const data0 = route.map((oneRoute) => {
    const path = oneRoute.reduce((pre, cur) => pre.concat(cur.fee, cur.tokenOut.address), [oneRoute.at(0)?.tokenIn.address] as Array<string>);
    const types = Array.from({ length: path.length }, (_, index) => (index % 2 === 1 ? 'uint24' : 'address'));

    const params = {
      path: pack(types, tradeTypeFunctionName === 'exactInput' ? path : path.reverse()),
      recipient: isDestinationTokenTokenCfx ? ZeroAddress : account,
      deadline: getDeadline(),
    };

    if (tradeTypeFunctionName === 'exactInput') {
      const amountOutMinimumDecimal = getAmountOutMinimumDecimal(oneRoute.at(-1)?.amountOut ?? '0', slippage);
      // console.log('amountOutMinimumDecimal', new Unit(amountOutMinimumDecimal).toDecimalStandardUnit());
      Object.assign(params, {
        amountIn: Unit.fromMinUnit(oneRoute.at(0)?.amountIn ?? '0').toHexMinUnit(),
        amountOutMinimum: new Unit(amountOutMinimumDecimal).toHexMinUnit(),
      });
    } else {
      const amountInMaximumDecimal = getAmountInMaximumDecimal(oneRoute.at(0)?.amountIn ?? '0', slippage);
      // console.log('amountInMaximumDecimal', amountInMaximumDecimal);
      Object.assign(params, {
        amountOut: Unit.fromMinUnit(oneRoute.at(-1)?.amountOut ?? '0').toHexMinUnit(),
        amountInMaximum: new Unit(amountInMaximumDecimal).toHexMinUnit(),
      });
    }

    const data = UniswapV3SwapRouter.func.interface.encodeFunctionData(tradeTypeFunctionName, [params]);
    return data;
  });

  const data1 = UniswapV3SwapRouter.func.interface.encodeFunctionData('unwrapWETH9', [0, account]);

  const data2 = UniswapV3SwapRouter.func.interface.encodeFunctionData('refundETH');

  const data = isDestinationTokenTokenCfx ? [...data0, data1] : [...data0];
  if (isSourceTokenCfx && tradeTypeFunctionName === 'exactOutput') {
    data.push(data2);
  }

  // console.log('value', new Unit(1).add(slippage).mul(Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals)).toDecimalMinUnit(0));

  const transactionParams = {
    // value: isSourceTokenCfx ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit() : '0x0',
    value: isSourceTokenCfx
      ? tradeTypeFunctionName === 'exactInput'
        ? Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toHexMinUnit()
        : new Unit(getAmountInMaximumDecimal(Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals), slippage)).toHexMinUnit()
      : '0x0',
    data: UniswapV3SwapRouter.func.interface.encodeFunctionData('multicall', [data]),
    to: UniswapV3SwapRouter.address,
  };

  const recordParams = {
    type: 'Swap',
    tokenA_Address: sourceToken.address,
    tokenA_Value: Unit.fromStandardUnit(sourceTokenAmount, sourceToken.decimals).toDecimalStandardUnit(5, sourceToken.decimals),
    tokenB_Address: destinationToken.address,
    tokenB_Value: Unit.fromStandardUnit(destinationTokenAmount, destinationToken.decimals).toDecimalStandardUnit(5, destinationToken.decimals),
  } as const;

  const txHash = await sendTransaction(transactionParams);
  addRecordToHistory({ txHash, ...recordParams });
  onSuccess();
  return txHash;
};

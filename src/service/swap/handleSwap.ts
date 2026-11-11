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

/** 报价各路径的整数金额之和与用户输入/输出对不上（只可能是取整以外的原因），需要重新报价。 */
export class QuoteMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuoteMismatchError';
  }
}

const toHexQuantity = (value: bigint) => `0x${value.toString(16)}`;

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
  const slippage = getSlippageTolerance();
  if (!sourceTokenWrapper || !destinationTokenWrpper || !sourceTokenAmount || !destinationTokenAmount || !bestTrade?.trade || !account || !sourceToken || !destinationToken)
    return '';

  const { route, tradeType } = bestTrade.trade;
  if (!route.length) return '';
  const isSourceTokenCfx = sourceToken?.address === 'CFX';
  const isDestinationTokenTokenCfx = destinationToken?.address === 'CFX';
  const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'exactInput' : 'exactOutput';
  const isExactInput = tradeTypeFunctionName === 'exactInput';
  const inputMinUnit = BigInt(Unit.fromStandardUnit(sourceTokenAmount, sourceTokenWrapper.decimals).toDecimalMinUnit(0));
  // 拆单时每条路径最多丢 1 个最小单位，所以「取整能解释的差额」上界就是路径数。
  // 这个绝对余量同时用于两处：exactIn 的差额校验、exactOut 的每路径 amountInMaximum。
  const dustSlack = BigInt(route.length);

  // 拆单报价里每条路径的金额是 Fraction 向下取整后的结果，其和可能比用户输入少 ≤ 路径数 个最小单位。
  // 把这点差额补回数值最大的路径，让「用户输入 == msg.value == calldata 实际花掉的量」三者严格相等：
  // Router 不会滞留原生币，也不会出现「确认页显示 A、链上只花 A-1」这种静默改动。
  // 只补 amountIn 的数值，不新增 multicall 调用；差额超过路径数说明这不是取整能解释的
  // （报价过期/口径不一致），拦下来提示重新报价，而不是发一笔注定出错的交易。
  // 报价侧补齐（routing-api / SOR）上线后差额为 0，这段就是 no-op。
  const amountsIn = route.map((oneRoute) => BigInt(oneRoute.at(0)?.amountIn ?? '0'));
  if (isExactInput) {
    const quotedTotal = amountsIn.reduce((sum, amount) => sum + amount, 0n);
    const dust = inputMinUnit - quotedTotal;
    if (dust < 0n || dust > dustSlack) {
      throw new QuoteMismatchError('报价已更新，请重新确认后再兑换');
    }
    if (dust > 0n) {
      let largestIndex = 0;
      for (let i = 1; i < amountsIn.length; i++) {
        if (amountsIn[i]! > amountsIn[largestIndex]!) largestIndex = i;
      }
      amountsIn[largestIndex] = amountsIn[largestIndex]! + dust;
    }
  }
  const amountsInTotal = amountsIn.reduce((sum, amount) => sum + amount, 0n);

  // exactOut：每条路径的 amountInMaximum 都加一个绝对余量，覆盖拆单取整与报价侧的整数补差；
  // value 取各路径上限之和，保证 Router 拿到的原生币一定够付，多余部分由原本就有的
  // refundETH 退回（不新增调用，exactOut 本来就有这一次）。slippage = 0 时不再使用
  // uint256 上限（那会让 value 变成 2^256-1，交易必然失败），退化为「报价输入 + 余量”。
  const amountsInMaximum = isExactInput
    ? []
    : route.map((oneRoute) => {
        const amountIn = BigInt(oneRoute.at(0)?.amountIn ?? '0');
        const capped = slippage === 0 ? amountIn : BigInt(getAmountInMaximumDecimal(amountIn.toString(), slippage));
        return capped + dustSlack;
      });
  const amountsInMaximumTotal = amountsInMaximum.reduce((sum, amount) => sum + amount, 0n);

  const data0 = route.map((oneRoute, routeIndex) => {
    const path = oneRoute.reduce((pre, cur) => pre.concat(cur.fee, cur.tokenOut.address), [oneRoute.at(0)?.tokenIn.address] as Array<string>);
    const types = Array.from({ length: path.length }, (_, index) => (index % 2 === 1 ? 'uint24' : 'address'));

    const params = {
      path: pack(types, tradeTypeFunctionName === 'exactInput' ? path : path.reverse()),
      recipient: isDestinationTokenTokenCfx ? ZeroAddress : account,
      deadline: getDeadline(),
    };

    if (tradeTypeFunctionName === 'exactInput') {
      const quotedAmountOut = BigInt(oneRoute.at(-1)?.amountOut ?? '0');
      // 零滑点的含义是「不接受任何不利变动」，而不是「接受任何价格」：
      // getAmountOutMinimumDecimal(_, 0) 会返回 0，等于把整笔交易送给三明治攻击。
      const amountOutMinimum =
        slippage === 0 ? quotedAmountOut : BigInt(getAmountOutMinimumDecimal(quotedAmountOut.toString(), slippage));
      Object.assign(params, {
        amountIn: toHexQuantity(amountsIn[routeIndex] ?? 0n),
        amountOutMinimum: toHexQuantity(amountOutMinimum),
      });
    } else {
      Object.assign(params, {
        amountOut: toHexQuantity(BigInt(oneRoute.at(-1)?.amountOut ?? '0')),
        amountInMaximum: toHexQuantity(amountsInMaximum[routeIndex] ?? 0n),
      });
    }

    const data = UniswapV3SwapRouter.func.interface.encodeFunctionData(tradeTypeFunctionName, [params]);
    return data;
  });

  const data1 = UniswapV3SwapRouter.func.interface.encodeFunctionData('unwrapWETH9', [0, account]);

  const data2 = UniswapV3SwapRouter.func.interface.encodeFunctionData('refundETH');

  const data = isDestinationTokenTokenCfx ? [...data0, data1] : [...data0];
  // exactInput 的 value 已经等于各路径 amountIn 之和（补差后即用户输入），没有余款，
  // 因此不需要 refundETH；exactOutput 的 value 含滑点余量，保留原本就有的 refundETH
  // （不是本次新增的调用）。
  if (isSourceTokenCfx && tradeTypeFunctionName === 'exactOutput') {
    data.push(data2);
  }

  const transactionParams = {
    // exactIn: 与 calldata 各路径 amountIn 之和严格相等（= 用户输入）；
    // exactOut: 各路径 amountInMaximum 之和，多出的部分由上面的 refundETH 退回。
    value: isSourceTokenCfx ? toHexQuantity(isExactInput ? amountsInTotal : amountsInMaximumTotal) : '0x0',
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

import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { AutoPositionManager } from '@contracts/index';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { updatePool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { type PositionForUI } from '.';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippage } from '@service/settings';
import { calcAmountsForLiquidity, calcLiquidityForAmounts } from '@utils/v3Math';
import showLiquidityPreviewModal from '@pages/Earn/LiquidityPreviewModal';
import { createPreviewPositionForUI } from './positions';

export const handleClickSubmitIncreasePositionLiquidity = async ({
  tokenId,
  'amount-tokenA': _amountTokenA,
  'amount-tokenB': _amountTokenB,
  tokenA: _tokenA,
  tokenB: _tokenB,
  position,
}: {
  'amount-tokenA': string;
  'amount-tokenB': string;
  tokenId: number;
  tokenA: Token;
  tokenB: Token;
  position: PositionForUI;
}) => {
  try {
    const account = getAccount();
    if (!account) return;
    const slippageTolerance = getSlippageTolerance();
    // 用链上实时价格算 liquidity/min，避免缓存价格过期导致 min 定得比实际存入量还高
    const pool = await updatePool({ tokenA: _tokenA, tokenB: _tokenB, fee: position.fee });
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;

    const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
    const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const amountTokenA = !!_amountTokenA ? _amountTokenA : '0';
    const amountTokenB = !!_amountTokenB ? _amountTokenB : '0';
    const [_token0Amount, _token1Amount] = notNeedSwap ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA];
    const token0Amount = !!_token0Amount ? _token0Amount : '0';
    const token1Amount = !!_token1Amount ? _token1Amount : '0';

    const token0AmountUnit = Unit.fromStandardUnit(token0Amount, token0.decimals);
    const token1AmountUnit = Unit.fromStandardUnit(token1Amount, token1.decimals);
    const amount0Desired = BigInt(token0AmountUnit.toHexMinUnit()).toString();
    const amount1Desired = BigInt(token1AmountUnit.toHexMinUnit()).toString();

    const sqrtPriceX96 = pool?.sqrtPriceX96;
    if (!sqrtPriceX96) return;

    const { tickLower, tickUpper } = position;

    const liquidity = calcLiquidityForAmounts({ sqrtPriceX96, tickLower, tickUpper, amount0: amount0Desired, amount1: amount1Desired });
    const { amount0, amount1 } = calcAmountsForLiquidity({ sqrtPriceX96, tickLower, tickUpper, liquidity });
    const { amount0Min, amount1Min } = calcAmountMinWithSlippage({
      sqrtPriceX96,
      slippage: slippageTolerance,
      tickLower,
      tickUpper,
      amount0: amount0Desired,
      amount1: amount1Desired,
    });

    const deadline = getDeadline();
    const data = AutoPositionManager.func.interface.encodeFunctionData('increaseLiquidity', [
      {
        tokenId,
        amount0Desired: token0AmountUnit.toHexMinUnit(),
        amount1Desired: token1AmountUnit.toHexMinUnit(),
        amount0Min: new Unit(amount0Min).toHexMinUnit(),
        amount1Min: new Unit(amount1Min).toHexMinUnit(),
        deadline,
      },
    ]);

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data,
      to: AutoPositionManager.address,
    };

    const [amountA, amountB] = notNeedSwap ? [amount0, amount1] : [amount1, amount0];
    const depositedAmountA = new Unit(amountA.toString()).toDecimalStandardUnit(undefined, tokenA.decimals);
    const depositedAmountB = new Unit(amountB.toString()).toDecimalStandardUnit(undefined, tokenB.decimals);

    // 历史记录记实际存入量，而不是用户输入的上限
    const recordParams = {
      type: 'Position_IncreaseLiquidity',
      tokenA_Address: _tokenA.address,
      tokenA_Value: depositedAmountA,
      tokenB_Address: _tokenB.address,
      tokenB_Value: depositedAmountB,
    } as const;

    showLiquidityPreviewModal({
      leftAmount: new Unit(depositedAmountA),
      rightAmount: new Unit(depositedAmountB),
      previewPosition: createPreviewPositionForUI(
        { tokenId, token0, token1, fee: position.fee, tickLower: position.tickLower, tickUpper: position.tickUpper, priceLower: position.priceLower, priceUpper: position.priceUpper },
        pool
      ),
      transactionParams,
      recordParams,
    });
  } catch (err) {
    console.error('Submit create position failed:', err);
  }
};

export const handleIncreasePositionLiquidity = async (transactionParams: { to: string; data: string; value: string }) => {
  const txHash = await sendTransaction(transactionParams);
  return txHash;
};

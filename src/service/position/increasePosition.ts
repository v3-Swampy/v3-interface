import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager } from '@contracts/index';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { getPool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { type PositionForUI } from '.';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippage } from '@service/settings';
import showLiquidityPreviewModal from '@pages/Pool/LiquidityPreviewModal';
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
    const slippageTolerance = getSlippageTolerance() || 0;
    const pool = await getPool({ tokenA: _tokenA, tokenB: _tokenB, fee: position.fee });
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

    const sqrtPriceX96 = pool?.sqrtPriceX96;
    let currentPrice = pool?.token0Price?.toDecimalMinUnit();
    currentPrice = new Unit(currentPrice!).mul(`1e${token1.decimals-token0.decimals}`).toDecimalMinUnit();

    const tickLower = position.tickLower;
    const tickUpper = position.tickUpper;

    if (!sqrtPriceX96 || !currentPrice) {
      return;
    }
    const { amount0Min, amount1Min } = calcAmountMinWithSlippage(
      sqrtPriceX96,
      slippageTolerance,
      currentPrice,
      tickLower,
      tickUpper,
      token0AmountUnit.toDecimalMinUnit(),
      token1AmountUnit.toDecimalMinUnit()
    );

    const dataWithoutCFX = NonfungiblePositionManager.func.interface.encodeFunctionData('increaseLiquidity', [
      {
        tokenId,
        amount0Desired: Unit.fromStandardUnit(token0Amount, token0.decimals).toHexMinUnit(),
        amount1Desired: Unit.fromStandardUnit(token1Amount, token1.decimals).toHexMinUnit(),
        amount0Min: new Unit(amount0Min).toHexMinUnit(),
        amount1Min: new Unit(amount1Min).toHexMinUnit(),
        deadline: getDeadline(),
      },
    ]);
    const dataWithCFX = NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [
      [dataWithoutCFX, NonfungiblePositionManager.func.interface.encodeFunctionData('refundETH')],
    ]);

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data: !hasWCFX ? dataWithoutCFX : dataWithCFX,
      to: NonfungiblePositionManager.address,
    };

    const recordParams = {
      type: 'Position_IncreaseLiquidity',
      tokenA_Address: _tokenA.address,
      tokenA_Value: amountTokenA,
      tokenB_Address: _tokenB.address,
      tokenB_Value: amountTokenB,
    } as const;

    showLiquidityPreviewModal({
      leftAmount: Unit.fromStandardUnit(amountTokenA, tokenA.decimals),
      rightAmount: Unit.fromStandardUnit(amountTokenB, tokenB.decimals),
      previewPosition: createPreviewPositionForUI(
        { tokenId: tokenId, token0, token1, fee: position.fee, tickLower: position.tickLower, tickUpper: position.tickUpper, priceLower: position.priceLower, priceUpper: position.priceUpper },
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

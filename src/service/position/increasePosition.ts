import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { uniqueId } from 'lodash-es';
import Decimal from 'decimal.js';
import { NonfungiblePositionManager } from '@contracts/index';
import { getWrapperTokenByAddress, isTokenEqual } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { getPool, type Pool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { type PositionForUI } from '.';
import { getDeadline, getSlippageTolerance } from '@service/settings';
import { setInvertedState } from '@modules/Position/invertedState';
import showLiquidityPreviewModal from '@pages/Pool/LiquidityPreviewModal';
import { createPreviewPositionForUI } from './positions';

const Q192 = new Decimal(2).toPower(192);
const Zero = new Unit(0);

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

    // const { amount0Min, amount1Min } = calcAmountMinWithSlippageTolerance({
    //   pool: pool ?? {
    //     tickCurrent: +findClosestValidTick({ fee, searchTick: calcTickFromPrice({ price: new Unit(priceInit!), tokenA, tokenB }) })?.toDecimalMinUnit(),
    //     sqrtPriceX96,
    //   } as Pool,
    //   token0,
    //   token1,
    //   token0Amount,
    //   token1Amount,
    //   fee,
    //   tickLower,
    //   tickUpper,
    //   slippageTolerance,
    // });
    // console.log(slippageTolerance, token0Amount, token1Amount);
    // console.log(amount0Min, amount1Min);

    const { amount0Min, amount1Min } = { amount0Min: 0, amount1Min: 0 };

    const previewUniqueId = uniqueId();
    const inverted = token0?.address === tokenA?.address;
    setInvertedState(previewUniqueId, inverted);
    // console.log(token0Amount, token1Amount)
    const data = NonfungiblePositionManager.func.interface.encodeFunctionData('increaseLiquidity', [
      {
        tokenId,
        amount0Desired: Unit.fromStandardUnit(token0Amount, token0.decimals).toHexMinUnit(),
        amount1Desired: Unit.fromStandardUnit(token1Amount, token1.decimals).toHexMinUnit(),
        amount0Min: Unit.fromStandardUnit(amount0Min, token0.decimals).toHexMinUnit(),
        amount1Min: Unit.fromStandardUnit(amount1Min, token1.decimals).toHexMinUnit(),
        deadline: getDeadline(),
      },
    ]);

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data,
      to: NonfungiblePositionManager.address,
    };

    const recordParams = {
      type: 'Position_IncreaseLiquidity',
      tokenA_Address: tokenA.address,
      tokenA_Value: Unit.fromStandardUnit(amountTokenA, tokenA.decimals).toDecimalStandardUnit(5),
      tokenB_Address: tokenB.address,
      tokenB_Value: Unit.fromStandardUnit(amountTokenB, tokenB.decimals).toDecimalStandardUnit(5),
    } as const;
    console.log(position.amount0?.toDecimalStandardUnit(5), position.token0.symbol, position.amount1?.toDecimalStandardUnit(5), position.token1.symbol)
    showLiquidityPreviewModal({
      leftToken: _tokenA,
      rightToken: _tokenB,
      leftAmount: Unit.fromStandardUnit(_amountTokenA).add((isTokenEqual(token0, _tokenA) ? position.amount0 : position.amount1) ?? 0),
      rightAmount: Unit.fromStandardUnit(_amountTokenB).add((isTokenEqual(token0, _tokenA) ? position.amount1 : position.amount0) ?? 0),
      inverted,
      previewUniqueId,
      previewPosition: createPreviewPositionForUI(
        { token0, token1, fee: position.fee, tickLower: position.tickLower, tickUpper: position.tickUpper, priceLower: position.priceLower, priceUpper: position.priceUpper },
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

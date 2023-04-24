import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { uniqueId } from 'lodash-es';
import Decimal from 'decimal.js';
import { NonfungiblePositionManager } from '@contracts/index';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { FeeAmount, getPool, type Pool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippageTolerance } from '@service/settings';
import { getMinTick, getMaxTick, calcTickFromPrice, findClosestValidTick } from '@service/pairs&pool';
import { setInvertedState } from '@modules/Position/invertedState';
import showLiquidityPreviewModal from '@pages/Pool/LiquidityPreviewModal';
import { createPreviewPositionForUI } from './positions';


const Q192 = new Decimal(2).toPower(192);
const Zero = new Unit(0);

export const handleClickSubmitCreatePosition = async ({
  fee: _fee,
  'amount-tokenA': _amountTokenA,
  'amount-tokenB': _amountTokenB,
  'price-lower': _priceLower,
  'price-upper': _priceUpper,
  tokenA: _tokenA,
  tokenB: _tokenB,
  priceInit,
}: {
  fee: FeeAmount;
  'amount-tokenA': string;
  'amount-tokenB': string;
  'price-lower': string;
  'price-upper': string;
  tokenA: Token;
  tokenB: Token;
  priceInit?: string;
}) => {
  try {
    const account = getAccount();
    if (!account) return;
    const fee = Number(_fee) as FeeAmount;
    const slippageTolerance = getSlippageTolerance();
    const pool = await getPool({ tokenA: _tokenA, tokenB: _tokenB, fee });
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;

    const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
    const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const amountTokenA = !!_amountTokenA ? _amountTokenA : '0';
    const amountTokenB = !!_amountTokenB ? _amountTokenB : '0';
    const [_token0Amount, _token1Amount] = notNeedSwap ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA];
    const token0Amount = !!_token0Amount ? _token0Amount : '0';
    const token1Amount = !!_token1Amount ? _token1Amount : '0';

    const isPriceLowerZero = new Unit(_priceLower).equals(Zero);
    const isPriceUpperInfinity = _priceUpper === 'Infinity';
    const [priceLower, priceUpper] = notNeedSwap
      ? [_priceLower, _priceUpper]
      : [isPriceUpperInfinity ? '0' : (1 / +_priceUpper).toFixed(5), isPriceLowerZero ? 'Infinity' : (1 / +_priceLower).toFixed(5)];

    const sqrtPriceX96 = priceInit
      ? Decimal.sqrt(new Decimal(priceInit).mul(Q192)).toFixed(0)
      : pool?.sqrtPriceX96 ?? Decimal.sqrt(new Decimal(token1Amount).div(new Decimal(token0Amount)).mul(Q192)).toFixed(0);

    const _tickLower = new Unit(priceLower).equals(Zero) ? getMinTick(fee) : calcTickFromPrice({ price: new Unit(priceLower), tokenA: token0, tokenB: token1 });
    const _tickUpper = priceUpper === 'Infinity' ? getMaxTick(fee) : calcTickFromPrice({ price: new Unit(priceUpper), tokenA: token0, tokenB: token1 });
    const tickLower = typeof _tickLower === 'number' ? _tickLower : +findClosestValidTick({ fee, searchTick: _tickLower }).toDecimalMinUnit();
    const tickUpper = typeof _tickUpper === 'number' ? _tickUpper : +findClosestValidTick({ fee, searchTick: _tickUpper }).toDecimalMinUnit();

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

    const data0 = NonfungiblePositionManager.func.interface.encodeFunctionData('createAndInitializePoolIfNecessary', [token0.address, token1.address, +fee, sqrtPriceX96]);
    const data1 = NonfungiblePositionManager.func.interface.encodeFunctionData('mint', [
      {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower,
        tickUpper,
        amount0Desired: Unit.fromStandardUnit(token0Amount, token0.decimals).toHexMinUnit(),
        amount1Desired: Unit.fromStandardUnit(token1Amount, token1.decimals).toHexMinUnit(),
        amount0Min: Unit.fromStandardUnit(amount0Min, token0.decimals).toHexMinUnit(),
        amount1Min: Unit.fromStandardUnit(amount1Min, token1.decimals).toHexMinUnit(),
        recipient: account,
        deadline: getDeadline(),
      },
    ]);

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data: NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [[data0, data1]]),
      to: NonfungiblePositionManager.address,
    };

    const recordParams = {
      type: 'Position_AddLiquidity',
      tokenA_Address: tokenA.address,
      tokenA_Value: Unit.fromStandardUnit(amountTokenA, tokenA.decimals).toDecimalStandardUnit(5),
      tokenB_Address: tokenB.address,
      tokenB_Value: Unit.fromStandardUnit(amountTokenB, tokenB.decimals).toDecimalStandardUnit(5),
    } as const;

    showLiquidityPreviewModal({
      leftToken: _tokenA,
      rightToken: _tokenB,
      leftAmount: Unit.fromStandardUnit(amountTokenA),
      rightAmount: Unit.fromStandardUnit(amountTokenB),
      inverted,
      priceInit,
      previewUniqueId,
      previewPosition: createPreviewPositionForUI({ token0, token1, fee, tickLower, tickUpper, priceLower: new Unit(priceLower), priceUpper: new Unit(priceUpper) }, pool),
      transactionParams,
      recordParams,
    });
  } catch (err) {
    console.error('Submit create position failed:', err);
  }
};

export const handleCreatePosition = async (transactionParams: { to: string; data: string; value: string }) => {
  const txHash = await sendTransaction(transactionParams);
  return txHash;
};

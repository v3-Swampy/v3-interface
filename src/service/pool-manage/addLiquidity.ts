import dayjs from 'dayjs';
import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { FeeAmount } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { getTransactionDeadline } from '@service/settings';
import { getMinTick, getMaxTick, calcTickFromPrice, findClosestValidTick } from '@service/pairs&pool';

const duration = dayjs.duration;
const Q192 = new Decimal(2).toPower(192);
const Zero = Unit.fromMinUnit(0);

export const addLiquidity = async ({
  fee: _fee,
  'amount-tokenA': amountTokenA,
  'amount-tokenB': amountTokenB,
  'price-lower': _priceLower,
  'price-upper': _priceUpper,
  tokenA: _tokenA,
  tokenB: _tokenB,
}: {
  fee: string;
  'amount-tokenA': string;
  'amount-tokenB': string;
  'price-lower': string;
  'price-upper': string;
  tokenA: Token;
  tokenB: Token;
}) => {
  try {
    const account = getAccount();
    if (!account) return;
    const fee = Number(_fee) as FeeAmount;
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;

    const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
    const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const [token0Amount, token1Amount] = notNeedSwap ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA];
    const isPriceLowerZero = Unit.fromMinUnit(_priceLower).equals(Zero);
    const isPriceUpperInfinity = _priceUpper === 'NaN';
    const [priceLower, priceUpper] = notNeedSwap
      ? [_priceLower, _priceUpper]
      : [isPriceUpperInfinity ? '0' : (1 / +_priceUpper).toFixed(5), isPriceLowerZero ? 'NaN' : (1 / +_priceLower).toFixed(5)];

    const sqrtPriceX96 = Decimal.sqrt(new Decimal(token1Amount).div(new Decimal(token0Amount)).mul(Q192)).toFixed(0);
    const data0 = NonfungiblePositionManager.func.encodeFunctionData('createAndInitializePoolIfNecessary', [token0.address, token1.address, +fee, sqrtPriceX96]);
    const deadline = dayjs(new Date()).add(duration(getTransactionDeadline(), 'minute')).unix();

    const tickLower = Unit.fromMinUnit(priceLower).equals(Zero) ? getMinTick(fee) : calcTickFromPrice({ price: Unit.fromMinUnit(priceLower), tokenA: token0, tokenB: token1 });
    const tickUpper = priceUpper === 'NaN' ? getMaxTick(fee) : calcTickFromPrice({ price: Unit.fromMinUnit(priceUpper), tokenA: token0, tokenB: token1 });

    const data1 = NonfungiblePositionManager.func.encodeFunctionData('mint', [
      {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower: typeof tickLower === 'number' ? tickLower : +findClosestValidTick({ fee, searchTick: tickLower }).toDecimalMinUnit(),
        tickUpper: typeof tickUpper === 'number' ? tickUpper : +findClosestValidTick({ fee, searchTick: tickUpper }).toDecimalMinUnit(),
        amount0Desired: Unit.fromStandardUnit(token0Amount, token0.decimals).toHexMinUnit(),
        amount1Desired: Unit.fromStandardUnit(token1Amount, token1.decimals).toHexMinUnit(),
        amount0Min: 0,
        amount1Min: 0,
        recipient: account,
        deadline,
      },
    ]);

    const data2 = NonfungiblePositionManager.func.encodeFunctionData('refundETH');

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const txHash = await sendTransaction({
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data: NonfungiblePositionManager.func.encodeFunctionData('multicall', [hasWCFX ? [data0, data1, data2] : [data0, data1]]),
      to: NonfungiblePositionManager.address,
    });

    return txHash;
  } catch (err) {
    console.error('addLiquidity failed:', err);
  }
};

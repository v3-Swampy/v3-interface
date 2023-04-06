import dayjs from 'dayjs';
import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { type FeeAmount } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import Decimal from 'decimal.js';
import { calcTickFromPrice, findClosestValidTick } from '@service/pairs&pool';

const duration = dayjs.duration;

export const addLiquidity = async ({
  fee,
  'amount-tokenA': amountTokenA,
  'amount-tokenB': amountTokenB,
  'price-lower': priceLower,
  'price-upper': priceUpper,
  tokenA: _tokenA,
  tokenB: _tokenB,
}: {
  fee: FeeAmount;
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

    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;
    const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const [token0Amount, token1Amount] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA]; // does safety checks

    const sqrtPriceX96 = Decimal.sqrt(new Decimal(token1Amount).div(new Decimal(token0Amount)).mul(new Decimal(2).toPower(192))).toFixed();
    const data0 = NonfungiblePositionManager.func.encodeFunctionData('createAndInitializePoolIfNecessary', [token0.address, token1.address, +fee, sqrtPriceX96]);

    const deadline = dayjs().add(duration(30, 'minute')).unix();

    const tickLower = calcTickFromPrice({ price: Unit.fromMinUnit(priceLower), tokenA, tokenB });
    const tickUpper = calcTickFromPrice({ price: Unit.fromMinUnit(priceUpper), tokenA, tokenB });

    const data1 = NonfungiblePositionManager.func.encodeFunctionData('mint', [
      {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower: findClosestValidTick({ fee, searchTick: tickLower }).toDecimalMinUnit(),
        tickUpper: findClosestValidTick({ fee, searchTick: tickUpper }).toDecimalMinUnit(),
        amount0Desired: +token0Amount,
        amount1Desired: +token1Amount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: account,
        deadline,
      },
    ]);

    const data2 = NonfungiblePositionManager.func.encodeFunctionData('refundETH');

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const res = await sendTransaction({
      data: NonfungiblePositionManager.func.encodeFunctionData('multicall', [hasWCFX ? [data0, data1, data2] : [data0, data1]]),
      to: NonfungiblePositionManager.address,
    });
  } catch (err) {
    console.error('addLiquidity failed:', err);
  }
};

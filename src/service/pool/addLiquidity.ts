import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { fetchChain } from '@utils/fetch';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { type Pool, type FeeAmount } from '@service/pairs&pool';
import { type Token } from '@service/tokens';

export const addLiquidity = async ({
  fee,
  'amount-tokenA': amountTokenA,
  'amount-tokenB': amountTokenB,
  'price-lower': priceLower,
  'price-upper': priceUpper,
  pool,
  tokenA: _tokenA,
  tokenB: _tokenB,
}: {
  fee: FeeAmount;
  'amount-tokenA': string;
  'amount-tokenB': string;
  'price-lower': string;
  'price-upper': string;
  pool: Pool;
  tokenA: Token;
  tokenB: Token;
}) => {
  try {
    const account = getAccount()!;
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;
    const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const [token0Amount, token1Amount] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA]; // does safety checks
  
    const data0 = await fetchChain<string>({
      params: [
        {
          data: NonfungiblePositionManager.func.encodeFunctionData('createAndInitializePoolIfNecessary', [
            token0.address,
            token1.address,
            +fee,
            Unit.fromMinUnit(pool.sqrtPriceX96!).toHexMinUnit(),
          ]),
          to: NonfungiblePositionManager.address,
        },
        'latest',
      ],
    });
    const data0Res: string = NonfungiblePositionManager.func.decodeFunctionResult('createAndInitializePoolIfNecessary', data0)?.[0];

    const tickLower = Unit.log(Unit.fromMinUnit(priceLower).mul(Unit.fromMinUnit(`1e${token1.decimals}`)).div(Unit.fromMinUnit(`1e${token0.decimals}`)), Unit.fromMinUnit(1.0001));
    const tickUpper = Unit.log(Unit.fromMinUnit(priceUpper).mul(Unit.fromMinUnit(`1e${token1.decimals}`)).div(Unit.fromMinUnit(`1e${token0.decimals}`)), Unit.fromMinUnit(1.0001));
    const data1 = await fetchChain({
      params: [
        {
          data: NonfungiblePositionManager.func.encodeFunctionData('mint', [
            [
              token0.address,
              token1.address,
              +fee,
              Math.floor(+tickLower.toDecimalMinUnit()),
              Math.floor(+tickUpper.toDecimalMinUnit()),
              Unit.fromStandardUnit(token0Amount, token0.decimals).toHexMinUnit(),
              Unit.fromStandardUnit(token1Amount, token1.decimals).toHexMinUnit(),
              '0x0',
              '0x0',
              account,
              '0x0'
            ]
          ]),
          to: NonfungiblePositionManager.address,
        },
        'latest',
      ],
    });
    console.log(data1)
  } catch (err) {
    console.log(err)
  }
};

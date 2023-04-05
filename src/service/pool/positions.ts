import { useMemo } from 'react';
import { selectorFamily, useRecoilValue } from 'recoil';
import { nearestUsableTick, TICK_SPACINGS, TickMath } from '@uniswap/v3-sdk';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { type Token, getTokenByAddress, stables, bases } from '@service/tokens';
import { FeeAmount, usePool, type Pool } from '@service/pairs&pool';

export enum PositionStatus {
  InRange,
  OutOfRange,
  Closed,
}

interface Position {
  tokenId: Unit;
  tokenA: string;
  tokenB: string;
  tickLower: number;
  tickUpper: number;
  fee: FeeAmount;
  liquidity: Unit;
  priceLower: Unit;
  priceHigher: Unit;
}

const positionBalanceQuery = selectorFamily<number, string>({
  key: `positionBalanceQuery-${import.meta.env.MODE}`,
  get: (account: string) => async () => {
    try {
      const response: any = await fetchChain<string>({
        params: [
          {
            data: NonfungiblePositionManager.func.encodeFunctionData('balanceOf', [account]),
            to: NonfungiblePositionManager.address,
          },
          'latest',
        ],
      });
      return response?.[0]?.toNumber();
    } catch (err) {
      throw err;
    }
  },
});

const tokenIdsQuery = selectorFamily<Array<string>, any>({
  key: `tokenIdsQuery-${import.meta.env.MODE}`,
  get:
    ({ tokenIdsArgs, account }) =>
    async () => {
      try {
        const tokenIdResults: any = await fetchChain<string>({
          params: [
            {
              data: NonfungiblePositionManager.func.encodeFunctionData('tokenOfOwnerByIndex', tokenIdsArgs),
              to: NonfungiblePositionManager.address,
            },
            'latest',
          ],
        });
        const tokenIds = useMemo(() => {
          if (account) {
            return tokenIdResults
              .map(({ result }: any) => result)
              .filter((result: any) => !!result)
              .map((result: any) => result[0])
              .toString();
          }
          return [];
        }, [account, tokenIdResults]);
        return tokenIds;
      } catch (err) {
        throw err;
      }
    },
});

const positionsQuery = selectorFamily<any, any>({
  key: `PositionListQuery-${import.meta.env.MODE}`,
  get: (tokenIds: string[][]) => async () => {
    try {
      const response = await fetchChain<string>({
        params: [
          {
            data: NonfungiblePositionManager.func.encodeFunctionData('positions', tokenIds),
            to: NonfungiblePositionManager.address,
          },
          'latest',
        ],
      });
      return response;
    } catch (err) {
      throw err;
    }
  },
});

export const usePositionBalance = (account: string) => useRecoilValue(positionBalanceQuery(account));

export const useTokenIds = (account: string, tokenIdsArgs: Array<Array<string | number>>) => useRecoilValue(tokenIdsQuery({ tokenIdsArgs, account }));

export const usePositionsFromTokenIds = (tokenIds: string[]) => {
  const inputs = useMemo(() => (tokenIds ? tokenIds.map((tokenId) => [Unit.fromMinUnit(tokenId).toHexMinUnit()]) : []), [tokenIds]);
  const results = useRecoilValue(positionsQuery(inputs));
  const positions = useMemo(() => {
    if (tokenIds) {
      return results.map((call: any, i: number) => {
        const tokenId = tokenIds[i];
        const result = call.result;
        return {
          tokenId,
          fee: result.fee,
          feeGrowthInside0LastX128: result.feeGrowthInside0LastX128,
          feeGrowthInside1LastX128: result.feeGrowthInside1LastX128,
          liquidity: result.liquidity,
          nonce: result.nonce,
          operator: result.operator,
          tickLower: result.tickLower,
          tickUpper: result.tickUpper,
          tokenA: result.token0,
          tokenB: result.token1,
          tokensOwedA: result.tokensOwed0,
          tokensOwedB: result.tokensOwed1,
        };
      });
    }
    return undefined;
  }, [results, tokenIds]);

  return {
    positions: positions?.map((position: Position, i: number) => ({ ...position, tokenId: inputs[i][0] })),
  };
};

export const usePositionsFromTokenId = (tokenId: string) => {
  const result = usePositionsFromTokenIds([tokenId]);
  return result.positions?.[0];
};

export function usePositions(account: string) {
  const accountBalance: number = usePositionBalance(account);
  const tokenIdsArgs = useMemo(() => {
    if (accountBalance && account) {
      const tokenRequests = [];
      for (let i = 0; i < accountBalance; i++) {
        tokenRequests.push([account, i]);
      }
      return tokenRequests;
    }
    return [];
  }, [account, accountBalance]);
  const tokenIds = useTokenIds(account, tokenIdsArgs);

  const results = usePositionsFromTokenIds(tokenIds);
  return results.positions;
}

export enum Bound {
  LOWER = 'LOWER',
  UPPER = 'UPPER',
}

export default function useIsTickAtLimit(feeAmount: FeeAmount | undefined, tickLower: number | undefined, tickUpper: number | undefined) {
  return useMemo(
    () => ({
      [Bound.LOWER]: feeAmount && tickLower ? tickLower === nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount as FeeAmount]) : undefined,
      [Bound.UPPER]: feeAmount && tickUpper ? tickUpper === nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[feeAmount as FeeAmount]) : undefined,
    }),
    [feeAmount, tickLower, tickUpper]
  );
}

export function getPositionPriceRange({
  tickLower,
  tickUpper,
  tokenADecimals,
  tokenBDecimals,
}: {
  tickLower: number;
  tickUpper: number;
  tokenADecimals: number;
  tokenBDecimals: number;
}) {
  const priceLower = Unit.pow(Unit.fromMinUnit(1.0001), Unit.fromMinUnit(tickLower))
    .mul(Unit.fromMinUnit(`1e${tokenADecimals}`))
    .div(Unit.fromMinUnit(`1e${tokenBDecimals}`));
  const priceUpper = Unit.pow(Unit.fromMinUnit(1.0001), Unit.fromMinUnit(tickUpper))
    .mul(Unit.fromMinUnit(`1e${tokenADecimals}`))
    .div(Unit.fromMinUnit(`1e${tokenBDecimals}`));
  return { priceLower, priceUpper };
}

export function getPriceOrderingFromPositionForUI(
  pool: Pool,
  position: Position
): {
  priceLower?: Unit | null;
  priceUpper?: Unit | null;
  quote?: Token;
  base?: Token;
} {
  if (!pool) {
    return {};
  }
  const tokenA = pool.tokenA;
  const tokenB = pool.tokenB;
  const tokenADecimals = tokenA.decimals;
  const tokenBDecimals = tokenB.decimals;
  const { tickLower, tickUpper } = position;
  const { priceLower, priceUpper }: { priceLower: Unit; priceUpper: Unit } = getPositionPriceRange({ tickLower, tickUpper, tokenADecimals, tokenBDecimals });
  const priceLowerInvert = Unit.fromMinUnit(1).div(priceLower);
  const priceUpperInvert = Unit.fromMinUnit(1).div(priceUpper);

  // if token0 is a dollar-stable asset, set it as the quote token
  if (stables.some((stable) => stable?.address === tokenA.address)) {
    return {
      priceLower: priceUpperInvert,
      priceUpper: priceLowerInvert,
      quote: tokenA,
      base: tokenB,
    };
  }

  // if token1 is an ETH-/BTC-stable asset, set it as the base token

  if (bases.some((base) => base?.address === tokenB.address)) {
    return {
      priceLower: priceUpperInvert,
      priceUpper: priceLowerInvert,
      quote: tokenA,
      base: tokenB,
    };
  }

  // if both prices are below 1, invert
  if (priceUpper.lessThan(Unit.fromMinUnit(1))) {
    return {
      priceLower: priceUpperInvert,
      priceUpper: priceLowerInvert,
      quote: tokenA,
      base: tokenB,
    };
  }

  // otherwise, just return the default
  return {
    priceLower,
    priceUpper,
    quote: tokenA,
    base: tokenB,
  };
}

export function usePosition(position: Position) {
  const { tokenA: tokenAAddress, tokenB: tokenBAddress, fee: feeAmount, tickLower, tickUpper } = position;

  const tokenA = getTokenByAddress(tokenAAddress);
  const tokenB = getTokenByAddress(tokenBAddress);

  // construct Position from details returned
  const pool: Pool = usePool({ tokenA, tokenB, fee: feeAmount });

  const tickAtLimit = useIsTickAtLimit(feeAmount, tickLower, tickUpper);

  // prices
  const { priceLower, priceUpper, quote, base } = getPriceOrderingFromPositionForUI(pool, position);

  // check if price is within range
  const outOfRange: boolean = pool && pool.tickCurrent && pool.tickCurrent ? pool.tickCurrent < tickLower || pool.tickCurrent >= tickUpper : false;
}

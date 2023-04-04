import { useMemo } from 'react';
import { selectorFamily, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { type Token, TokenVST, TokenCFX, getTokenByAddress } from '@service/tokens';
import { FeeAmount } from '@service/pairs&pool';

export enum PositionStatus {
  InRange,
  OutOfRange,
  Closed,
}

interface Position {
  tokenId: Unit;
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
  fee: FeeAmount;
  liquidity: Unit;
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
              .map((result: any) => Unit.fromMinUnit(result[0]));
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
  get: (tokenIds: Unit[][]) => async () => {
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

export const usePositionsFromTokenIds = (tokenIds: Unit[][]) => useRecoilValue(positionsQuery(tokenIds));

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
  const inputs = useMemo(() => (tokenIds ? tokenIds.map((tokenId) => [Unit.fromMinUnit(tokenId)]) : []), [tokenIds]);
  const results = usePositionsFromTokenIds(inputs);
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
          token0: result.token0,
          token1: result.token1,
          tokensOwed0: result.tokensOwed0,
          tokensOwed1: result.tokensOwed1,
        };
      });
    }
    return undefined;
  }, [results, tokenIds]);

  return {
    positions: positions?.map((position: Position, i: number) => ({ ...position, tokenId: inputs[i][0] })),
  };
}

export function usePosition(position: Position) {
  const { token0: token0Address, token1: token1Address, tokenId, fee: feeAmount, liquidity, tickLower, tickUpper } = position;

  const token0 = getTokenByAddress(token0Address)
  const token1 = getTokenByAddress(token1Address)

  // construct Position from details returned
  const [, pool] = usePool(currency0 ?? undefined, currency1 ?? undefined, feeAmount)



  const tickAtLimit = useIsTickAtLimit(feeAmount, tickLower, tickUpper)

  // prices
  const { priceLower, priceUpper, quote, base } = getPriceOrderingFromPositionForUI(position)

  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  // check if price is within range
  const outOfRange: boolean = pool ? pool.tickCurrent < tickLower || pool.tickCurrent >= tickUpper : false
}

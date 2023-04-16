import { useMemo, useCallback } from 'react';
import { selectorFamily, useRecoilValue } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { pack } from '@ethersproject/solidity';
import { type Token, isTokenEqual, getWrapperTokenByAddress, TokenUSDT } from '@service/tokens';
import { fetchChain } from '@utils/fetch';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { UniswapV3Quoter } from '@contracts/index';
import { isPoolEqual } from '.';
import { type Pool, usePools } from '.';

interface RouteProps {
  tokenIn: Token;
  tokenOut: Token;
  pools: Pool[];
}

export class Route implements RouteProps {
  public tokenIn: Token;
  public tokenOut: Token;
  public pools: Pool[];
  constructor({ tokenIn, tokenOut, pools }: RouteProps) {
    this.tokenIn = tokenIn;
    this.tokenOut = tokenOut;
    this.pools = pools;
  }
}

export const computeAllRoutes = (tokenIn: Token, tokenOut: Token, pools: Pool[], currentPath: Pool[] = [], allPaths: Route[] = [], startTokenIn: Token = tokenIn, maxHop = 2) => {
  if (!tokenIn || !tokenOut) throw new Error('Missing tokenIn/tokenOut');

  for (const pool of pools) {
    if (!pool.involvesToken(tokenIn) || currentPath.find((pathPool) => isPoolEqual(pool, pathPool))) continue;

    const outputToken = isTokenEqual(pool.token0, tokenIn) ? pool.token1 : pool.token0;
    if (isTokenEqual(outputToken, tokenOut)) {
      allPaths.push(new Route({ pools: [...currentPath, pool], tokenIn: startTokenIn, tokenOut }));
    } else if (maxHop > 1) {
      computeAllRoutes(outputToken, tokenOut, pools, [...currentPath, pool], allPaths, startTokenIn, maxHop - 1);
    }
  }

  return allPaths;
};

export const useAllRoutes = (_tokenIn: Token | null, _tokenOut: Token | null) => {
  const tokenIn = useMemo(() => getWrapperTokenByAddress(_tokenIn?.address), [_tokenIn]);
  const tokenOut = useMemo(() => getWrapperTokenByAddress(_tokenOut?.address), [_tokenOut]);

  const pools = usePools(tokenIn, tokenOut);

  return useMemo(() => {
    if (!pools || !tokenIn || !tokenOut) return [];
    const routes = computeAllRoutes(tokenIn, tokenOut, pools, [], [], tokenIn, 2);
    return routes;
  }, [tokenIn?.address, tokenOut?.address, pools?.length]);
};

export enum TradeType {
  EXACT_INPUT = 0,
  EXACT_OUTPUT = 1,
}

export const encodeRouteToPath = (route: Route, exactOutput: boolean): string => {
  const firstInputToken: Token = route.tokenIn;

  const { path, types } = route.pools.reduce(
    (
      { inputToken, path, types }: { inputToken: Token; path: (string | number)[]; types: string[] },
      pool: Pool,
      index
    ): { inputToken: Token; path: (string | number)[]; types: string[] } => {
      const outputToken: Token = isTokenEqual(pool.token0, inputToken) ? pool.token1 : pool.token0;
      if (index === 0) {
        return {
          inputToken: outputToken,
          types: ['address', 'uint24', 'address'],
          path: [inputToken.address, pool.fee, outputToken.address],
        };
      } else {
        return {
          inputToken: outputToken,
          types: [...types, 'uint24', 'address'],
          path: [...path, pool.fee, outputToken.address],
        };
      }
    },
    { inputToken: firstInputToken, path: [], types: [] }
  );

  return exactOutput ? pack(types.reverse(), path.reverse()) : pack(types, path);
};

export const getQuoteCallParameters = (route: Route, amount: string, tradeType: TradeType) => {
  const singleHop = route.pools.length === 1;
  let callData: string;
  if (singleHop) {
    const quoteParams = [route.tokenIn.address, route.tokenOut.address, route.pools[0].fee, amount, new Unit(0).toHexMinUnit()];
    const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInputSingle' : 'quoteExactOutputSingle';
    callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, quoteParams);
  } else {
    const path: string = encodeRouteToPath(route, tradeType === TradeType.EXACT_OUTPUT);
    const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInput' : 'quoteExactOutput';
    callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, [path, amount]);
  }
  return {
    callData,
    value: new Unit(0).toHexMinUnit(),
  };
};

const quoteSelector = selectorFamily({
  key: `quoteSelector-${import.meta.env.MODE}`,
  get: (callDataStr: string) => async () => {
    console.log('call', callDataStr)
    if (callDataStr === '') return [];
    const response = await fetchChain({
      params: [
        {
          data: callDataStr.split(','),
          to: UniswapV3Quoter.address,
        },
        'latest',
      ],
    });
    console.log('response', response)
    return response
  },
});

export const useQuote = (callDataStr: string) => useRecoilValue(quoteSelector(callDataStr));

export enum TradeState {
  LOADING,
  INVALID,
  NO_ROUTE_FOUND,
  VALID,
  SYNCING,
}

export const useClientBestTrade = (tradeType: TradeType, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const amountDecimals = tradeType === TradeType.EXACT_INPUT ? tokenIn?.decimals : tokenOut?.decimals;
  const amountBig = Unit.fromStandardUnit(amount, amountDecimals);
  const hexAmount = amountBig.toHexMinUnit();
  console.log(amountDecimals, amountBig, hexAmount)
  console.log(tokenIn, tokenOut);
  const routes = useAllRoutes(tokenIn, tokenOut);
  console.log('routes', routes);
  const callData = useMemo(
    () => (hexAmount ? routes.map((route) => getQuoteCallParameters(route, hexAmount, tradeType).callData) : []),
    [hexAmount, tokenIn?.address, tokenOut?.address, tradeType, routes.length]
  );
  console.log('callData', callData);
  const quoteResults: [] = useQuote(callData.length === 0 ? '' : callData.join(','));

  const tokensAreTheSame = useMemo(() => tokenIn && tokenOut && isTokenEqual(tokenIn, tokenOut), [tokenIn?.address, tokenOut?.address]);
  return useMemo(() => {
    const tokensAreTheSame = tokenIn && tokenOut && isTokenEqual(tokenIn, tokenOut);
    if (!amount || !tokenIn || !tokenOut || quoteResults.some(({ valid }) => !valid) || tokensAreTheSame)
      return {
        state: TradeState.NO_ROUTE_FOUND,
        trade: undefined,
      };

    const { bestRoute, amountIn, amountOut } = quoteResults.reduce(
      (
        currentBest: {
          bestRoute: Route | null;
          amountIn: Unit | null;
          amountOut: Unit | null;
        },
        { result },
        i
      ) => {
        if (!result) return currentBest;

        // overwrite the current best if it's not defined or if this route is better
        if (tradeType === TradeType.EXACT_INPUT) {
          const amountOut = new Unit(result.amountOut.toString());
          if (currentBest.amountOut === null || currentBest.amountOut.lessThan(amountOut)) {
            return {
              bestRoute: routes[i],
              amountIn: amountBig,
              amountOut,
            };
          }
        } else {
          const amountIn = new Unit(result.amountIn.toString());
          if (currentBest.amountIn === null || currentBest.amountIn.greaterThan(amountIn)) {
            return {
              bestRoute: routes[i],
              amountIn,
              amountOut: amountBig,
            };
          }
        }

        return currentBest;
      },
      {
        bestRoute: null,
        amountIn: null,
        amountOut: null,
      }
    );

    if (!bestRoute || !amountIn || !amountOut) {
      return {
        state: TradeState.NO_ROUTE_FOUND,
        trade: undefined,
      };
    }

    return {
      state: TradeState.VALID,
      trade: {
        route: bestRoute,
        amountIn,
        amountOut,
        tradeType,
      },
    };
  }, [amount, tokensAreTheSame, tokenIn?.address, tokenOut?.address, tradeType]);
};

export const useTokenPrice = (tokenAddress: string) => {
  const token = getWrapperTokenByAddress(tokenAddress);
  const result: any = useClientBestTrade(TradeType.EXACT_INPUT, '1', token, TokenUSDT);
  if (result.state === TradeState.VALID) {
    return new Unit(result.trade.amountOut).toDecimalStandardUnit(TokenUSDT.decimals);
  }
  return undefined;
};
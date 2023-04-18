import { useMemo, useState, useEffect } from 'react';
import { selectorFamily, useRecoilValue } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { pack } from '@ethersproject/solidity';
import { type Token, isTokenEqual, getWrapperTokenByAddress, TokenUSDT } from '@service/tokens';
import { fetchChain } from '@utils/fetch';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { UniswapV3Quoter, fetchMulticall } from '@contracts/index';
import { TradeType } from '@service/swap';
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
  const tokenIn = useMemo(() => getWrapperTokenByAddress(_tokenIn?.address), [_tokenIn?.address]);
  const tokenOut = useMemo(() => getWrapperTokenByAddress(_tokenOut?.address), [_tokenOut?.address]);

  const pools = usePools(tokenIn, tokenOut);
  console.log('allpools', pools);

  return useMemo(() => {
    if (!pools || !tokenIn || !tokenOut) return [];
    const routes = computeAllRoutes(tokenIn, tokenOut, pools, [], [], tokenIn, 2);
    return routes;
  }, [tokenIn?.address, tokenOut?.address, pools?.length]);
};

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
  const tradeTypeFunctionName = getQuoteFunctionName(route, tradeType);
  if (singleHop) {
    const quoteParams = [route.tokenIn.address, route.tokenOut.address, route.pools[0].fee, amount, new Unit(0).toHexMinUnit()];
    callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, quoteParams);
  } else {
    const path: string = encodeRouteToPath(route, tradeType === TradeType.EXACT_OUTPUT);
    console.log('path', path);
    callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, [path, amount]);
  }
  return {
    callData,
    value: new Unit(0).toHexMinUnit(),
  };
};

export const getQuoteFunctionName = (route: Route, tradeType: TradeType) => {
  const singleHop = route.pools.length === 1;
  let tradeTypeFunctionName;
  if (singleHop) {
    tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInputSingle' : 'quoteExactOutputSingle';
  } else {
    tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInput' : 'quoteExactOutput';
  }
  return tradeTypeFunctionName;
};

export enum TradeState {
  LOADING,
  INVALID,
  NO_ROUTE_FOUND,
  VALID,
  SYNCING,
}

export const useClientBestTrade = (tradeType: TradeType, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const amountDecimals = tradeType === TradeType.EXACT_INPUT ? tokenIn?.decimals : tokenOut?.decimals;
  console.log('amount', amount, tradeType);
  const amountBig = Unit.fromStandardUnit(amount || '0', amountDecimals);
  const hexAmount = amountBig.toHexMinUnit();
  const routes = useAllRoutes(tokenIn, tokenOut);
  console.log('routes', routes);
  const callData = useMemo(() => {
    if (!amount) return [];
    return routes.map((route) => getQuoteCallParameters(route, hexAmount, tradeType).callData);
  }, [amount, tokenIn?.address, tokenOut?.address, tradeType, routes.length]);
  const [quoteResults, setQuoteResults] = useState<Array<any>>([]);
  useEffect(() => {
    console.log(
      'callData',
      callData.map((data) => [UniswapV3Quoter.address, data])
    );
    if (callData.length === 0) return setQuoteResults([]);
    fetchMulticall(callData.map((data) => [UniswapV3Quoter.address, data])).then((res) => {
      console.log('res', res);
      const decodeData = res?.map((data, i) => {
        const tradeTypeFunctionName = getQuoteFunctionName(routes[i], tradeType);
        const result = data && data !== '0x' ? UniswapV3Quoter.func.interface.decodeFunctionResult(tradeTypeFunctionName, data) : {};
        return result;
      });
      setQuoteResults(decodeData || []);
    });
  }, [callData.length]);
  console.log('quoteResults', quoteResults);
  const tokensAreTheSame = useMemo(() => tokenIn && tokenOut && isTokenEqual(tokenIn, tokenOut), [tokenIn?.address, tokenOut?.address]);
  return useMemo(() => {
    const tokensAreTheSame = tokenIn && tokenOut && isTokenEqual(tokenIn, tokenOut);
    if (!amount || !tokenIn || !tokenOut || tokensAreTheSame)
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
        result,
        i
      ) => {
        console.log('result', result);
        if (!result) return currentBest;

        // overwrite the current best if it's not defined or if this route is better
        if (tradeType === TradeType.EXACT_INPUT) {
          const amountOut = new Unit(result.toString());
          if (currentBest.amountOut === null || currentBest.amountOut.lessThan(amountOut)) {
            return {
              bestRoute: routes[i],
              amountIn: amountBig,
              amountOut,
            };
          }
        } else {
          const amountIn = new Unit(result.toString());
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
  }, [amount, tokensAreTheSame, tokenIn?.address, tokenOut?.address, tradeType, quoteResults.length]);
};

export const useTokenPrice = (tokenAddress: string | undefined) => {
  if (!tokenAddress) return undefined;
  if (tokenAddress == TokenUSDT.address) return '1';
  const token = getWrapperTokenByAddress(tokenAddress);
  const result: any = useClientBestTrade(TradeType.EXACT_INPUT, '1', token, TokenUSDT);
  if (result.state === TradeState.VALID) {
    console.log(new Unit(result.trade.amountIn).toDecimalStandardUnit(token?.decimals), new Unit(result.trade.amountOut).toDecimalStandardUnit(TokenUSDT?.decimals));
    return new Unit(result.trade.amountOut).toDecimalStandardUnit(undefined, TokenUSDT.decimals);
  }
  return undefined;
};

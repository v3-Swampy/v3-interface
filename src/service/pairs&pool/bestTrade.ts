import { useMemo, useState, useEffect, useRef } from 'react';
import { uniqueId } from 'lodash-es';
import { pack } from '@ethersproject/solidity';
import { type Token, isTokenEqual, getWrapperTokenByAddress, TokenUSDT } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { UniswapV3Quoter } from '@contracts/index';
import { isPoolEqual } from '.';
import { type Pool, usePools } from '.';
import { getRouter, getClientSideQuote, Protocol, V3PoolInRoute } from './clientSideSmartOrderRouter';
import { targetChainId } from '@service/account';

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

interface Route {
  address: string;
  amountIn: string;
  amountOut: string;
  fee: string;
  liquidity: string;
  sqrtRatioX96: string;
  tickCurrent: string;
  tokenIn: Token;
  tokenOut: Token;
  type: 'v3-pool';
}

// interface RouteProps {
//   tokenIn: Token;
//   tokenOut: Token;
//   pools: Pool[];
// }

// class Route implements RouteProps {
//   public tokenIn: Token;
//   public tokenOut: Token;
//   public pools: Pool[];
//   constructor({ tokenIn, tokenOut, pools }: RouteProps) {
//     this.tokenIn = tokenIn;
//     this.tokenOut = tokenOut;
//     this.pools = pools;
//   }
// }

export enum TradeState {
  INVALID = 'INVALID',
  LOADING = 'LOADING',
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',
  VALID = 'VALID',
  ERROR = 'ERROR',
}

export interface BestTrade {
  state: TradeState;
  error?: string;
  trade?: {
    route: Route[][];
    amountIn: Unit;
    amountOut: Unit;
    priceIn: Unit;
    priceOut: Unit;
    networkFeeByAmount: Unit;
    tradeType: TradeType;
  };
}

// export const encodeRouteToPath = (route: Route, exactOutput: boolean): string => {
//   const firstInputToken: Token = route.tokenIn;

//   const { path, types } = route.pools.reduce(
//     (
//       { inputToken, path, types }: { inputToken: Token; path: (string | number)[]; types: string[] },
//       pool: Pool,
//       index
//     ): { inputToken: Token; path: (string | number)[]; types: string[] } => {
//       const outputToken: Token = isTokenEqual(pool.token0, inputToken) ? pool.token1 : pool.token0;
//       if (index === 0) {
//         return {
//           inputToken: outputToken,
//           types: ['address', 'uint24', 'address'],
//           path: [inputToken.address, pool.fee, outputToken.address],
//         };
//       } else {
//         return {
//           inputToken: outputToken,
//           types: [...types, 'uint24', 'address'],
//           path: [...path, pool.fee, outputToken.address],
//         };
//       }
//     },
//     { inputToken: firstInputToken, path: [], types: [] }
//   );

//   return exactOutput ? pack(types.reverse(), path.reverse()) : pack(types, path);
// };

// export const getQuoteCallParameters = (route: Route, amount: string, tradeType: TradeType) => {
//   const singleHop = route.pools.length === 1;
//   let callData: string;
//   const tradeTypeFunctionName = getQuoteFunctionName(route, tradeType);
//   if (singleHop) {
//     const quoteParams = [route.tokenIn.address, route.tokenOut.address, route.pools[0].fee, amount, new Unit(0).toHexMinUnit()];
//     callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, quoteParams);
//   } else {
//     const path: string = encodeRouteToPath(route, tradeType === TradeType.EXACT_OUTPUT);
//     // console.log('path', path);
//     callData = UniswapV3Quoter.func.interface.encodeFunctionData(tradeTypeFunctionName, [path, amount]);
//   }
//   return {
//     callData,
//     value: new Unit(0).toHexMinUnit(),
//   };
// };

// export const getQuoteFunctionName = (route: Route, tradeType: TradeType) => {
//   const singleHop = route.pools.length === 1;
//   let tradeTypeFunctionName;
//   if (singleHop) {
//     tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInputSingle' : 'quoteExactOutputSingle';
//   } else {
//     tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quoteExactInput' : 'quoteExactOutput';
//   }
//   return tradeTypeFunctionName;
// };

export enum RouterPreference {
  API = 'api',
  CLIENT = 'client',
  PRICE = 'price',
}

interface GetQuoteArgs {
  tokenInAddress: string;
  tokenInChainId: number;
  tokenInDecimals: number;
  tokenInSymbol?: string;
  tokenOutAddress: string;
  tokenOutChainId: number;
  tokenOutDecimals: number;
  tokenOutSymbol?: string;
  amount: string;
  type: TradeType;
}

const CLIENT_PARAMS = {
  protocols: [Protocol.V3],
};

export const getClientSmartOrderRouter = async (args: GetQuoteArgs) => {
  const router = getRouter();
  return await getClientSideQuote(args, router, CLIENT_PARAMS);
};

export const useClientBestTrade = (tradeType: TradeType | null, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const [bestTrade, setBestTrade] = useState<BestTrade>({ state: TradeState.INVALID });
  useEffect(() => {
    const tokenInWrappered = getWrapperTokenByAddress(tokenIn?.address);
    const tokenOutWrappered = getWrapperTokenByAddress(tokenOut?.address);
    if (!amount || !tokenInWrappered || !tokenOutWrappered || tradeType === null) {
      setBestTrade((pre) => (pre.state === TradeState.INVALID ? pre : { state: TradeState.INVALID }));
      return;
    }
    const amountUnit = Unit.fromStandardUnit(amount, tradeType === TradeType.EXACT_INPUT ? tokenInWrappered.decimals : tokenOutWrappered.decimals);
    const router = getRouter();
    const args: GetQuoteArgs = {
      tokenInAddress: tokenInWrappered.address,
      tokenInChainId: Number(targetChainId),
      tokenInDecimals: tokenInWrappered.decimals,
      tokenInSymbol: tokenInWrappered.symbol,
      tokenOutAddress: tokenOutWrappered.address,
      tokenOutChainId: Number(targetChainId),
      tokenOutDecimals: tokenOutWrappered.decimals,
      tokenOutSymbol: tokenOutWrappered.symbol,
      amount: amountUnit.toDecimalMinUnit(),
      type: tradeType,
    };
    setBestTrade({ state: TradeState.LOADING });
    getClientSideQuote(args, router, CLIENT_PARAMS).then((res) => {
      if (res?.error) {
        setBestTrade({
          state: TradeState.ERROR,
        });
      } else {
        const data = res?.data;
        console.log('client', data);
        const amountIn = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(data?.quote ?? 0);
        const amountOut = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(data?.quote ?? 0) : amountUnit;

        const amountInGasAdjusted = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(data?.quoteGasAdjusted ?? 0);
        const amountOutGasAdjusted = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(data?.quoteGasAdjusted ?? 0) : amountUnit;

        const priceIn = amountInGasAdjusted.div(amountOutGasAdjusted);
        const priceOut = amountOutGasAdjusted.div(amountInGasAdjusted);

        setBestTrade({
          state: TradeState.VALID,
          trade: {
            amountIn,
            amountOut,
            priceIn,
            priceOut,
            route: data.route as unknown as Route[][],
            tradeType,
            networkFeeByAmount: amountOut.sub(amountOutGasAdjusted),
          },
        });
      }
    });
  }, [tradeType, amount, tokenIn?.address, tokenOut?.address]);
  return bestTrade;
};

export const useServerBestTrade = (tradeType: TradeType | null, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const [bestTrade, setBestTrade] = useState<BestTrade>({ state: TradeState.INVALID });
  const uniqueIdFetchId = useRef<string>('init');

  useEffect(() => {
    const tokenInWrappered = getWrapperTokenByAddress(tokenIn?.address);
    const tokenOutWrappered = getWrapperTokenByAddress(tokenOut?.address);
    if (!amount || !tokenInWrappered || !tokenOutWrappered || tradeType === null) {
      setBestTrade((pre) => (pre.state === TradeState.INVALID ? pre : { state: TradeState.INVALID }));
      return;
    }

    uniqueIdFetchId.current = uniqueId('useServerBestTrade');
    const currentUniqueId = uniqueIdFetchId.current;
    const amountUnit = Unit.fromStandardUnit(amount, tradeType === TradeType.EXACT_INPUT ? tokenInWrappered.decimals : tokenOutWrappered.decimals);

    setBestTrade({ state: TradeState.LOADING });
    fetch(
      `https://dhajrqdgke.execute-api.ap-southeast-1.amazonaws.com/prod/quote?tokenInAddress=${tokenInWrappered.address}&tokenInChainId=${
        tokenInWrappered.chainId
      }&tokenOutAddress=${tokenOutWrappered.address}&tokenOutChainId=${tokenOutWrappered.chainId}&amount=${amountUnit.toDecimalMinUnit()}&type=${
        tradeType === TradeType.EXACT_INPUT ? 'exactIn' : 'exactOut'
      }`
    )
      .then((res) => res.json())
      .then((res) => {
        if (currentUniqueId !== uniqueIdFetchId.current) {
          return;
        }
        if (res?.errorCode) {
          setBestTrade({
            state: TradeState.ERROR,
            error: res.errorCode === 'NO_ROUTE' ? 'No Valid Route Found, cannot swap. ' : res.errorCode,
          });
        } else {
          console.log('server', 'tradeType: ', tradeType, res);
          const amountIn = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quote ?? 0);
          const amountOut = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quote ?? 0) : amountUnit;

          const amountInGasAdjusted = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0);
          const amountOutGasAdjusted = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0) : amountUnit;

          const priceIn = amountInGasAdjusted.div(amountOutGasAdjusted);
          const priceOut = amountOutGasAdjusted.div(amountInGasAdjusted);

          setBestTrade({
            state: TradeState.VALID,
            trade: {
              amountIn,
              amountOut,
              priceIn,
              priceOut,
              route: res.route,
              tradeType,
              networkFeeByAmount: amountOut.sub(amountOutGasAdjusted),
            },
          });
        }
      });
  }, [tradeType, amount, tokenIn?.address, tokenOut?.address]);

  return bestTrade;
};

export const useBestTrade = useServerBestTrade;

/** undefined means loading */
export const useTokenPrice = (tokenAddress: string | undefined) => {
  const token = getWrapperTokenByAddress(tokenAddress);
  if (tokenAddress == TokenUSDT.address) return '1';
  const result = useServerBestTrade(TradeType.EXACT_INPUT, '1', token, TokenUSDT);
  if (!tokenAddress) return undefined;
  if (result.state === TradeState.LOADING) return undefined;
  if (result.state === TradeState.VALID) {
    return result.trade!.amountOut.toDecimalStandardUnit(undefined, TokenUSDT.decimals);
  }
  return null;
};

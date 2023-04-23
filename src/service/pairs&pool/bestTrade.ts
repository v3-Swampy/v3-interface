import { useState, useEffect, useRef } from 'react';
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
    priceImpact: Unit;
    tradeType: TradeType;
  };
}

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
    getClientSideQuote(args, router, CLIENT_PARAMS).then((_res) => {
      if (_res?.error) {
        setBestTrade({
          state: TradeState.ERROR,
        });
      } else {
        const res = _res?.data;
        console.log('client', res);
        const route = res.route as Route[][];
        amount !== '1' && console.log('tradeType: ', tradeType, res);
        const amountIn = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quote ?? 0);
        const amountOut = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quote ?? 0) : amountUnit;

        const amountInGasAdjusted = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0);
        const amountOutGasAdjusted = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0) : amountUnit;

        const priceIn = amountIn.div(amountOut);
        const priceOut = amountOut.div(amountIn);

        const networkFeeByAmount = tradeType === TradeType.EXACT_INPUT ? amountOut.sub(amountOutGasAdjusted) : amountInGasAdjusted.sub(amountIn);

        const priceImpact = route.reduce((pre, oneRoute) => {
          const overallPercent = new Unit(oneRoute.at(0)?.amountIn || 0).div(amountIn);
          const percent = oneRoute.reduce((currentFee, pool) => currentFee.mul(new Unit(1).sub(new Unit(pool.fee).div(1000000))), new Unit(1));
          return pre.add(overallPercent.mul(new Unit(1).sub(percent)));
        }, new Unit(0));

        setBestTrade({
          state: TradeState.VALID,
          trade: {
            amountIn,
            amountOut,
            priceIn,
            priceOut,
            route,
            tradeType,
            networkFeeByAmount,
            priceImpact
          },
        });
      }
    });
  }, [tradeType, amount, tokenIn?.address, tokenOut?.address]);
  return bestTrade;
};

export const useServerBestTrade = (tradeType: TradeType | null, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const uniqueIdFetchId = useRef<string>('init');
  const [bestTrade, setBestTrade] = useState<BestTrade>({ state: TradeState.INVALID });

  useEffect(() => {
    const tokenInWrappered = getWrapperTokenByAddress(tokenIn?.address);
    const tokenOutWrappered = getWrapperTokenByAddress(tokenOut?.address);

    if (!amount || !tokenInWrappered || !tokenOutWrappered || tradeType === null || tokenInWrappered?.address === tokenOutWrappered?.address) {
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
          const route = res.route as Route[][];
          amount !== '1' && console.log('server', 'tradeType: ', tradeType, res);
          const amountIn = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quote ?? 0);
          const amountOut = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quote ?? 0) : amountUnit;

          const amountInGasAdjusted = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0);
          const amountOutGasAdjusted = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quoteGasAdjusted ?? 0) : amountUnit;

          const priceIn = amountIn.div(amountOut);
          const priceOut = amountOut.div(amountIn);

          const networkFeeByAmount = tradeType === TradeType.EXACT_INPUT ? amountOut.sub(amountOutGasAdjusted) : amountInGasAdjusted.sub(amountIn);

          const priceImpact = route.reduce((pre, oneRoute) => {
            const overallPercent = new Unit(oneRoute.at(0)?.amountIn || 0).div(amountIn);
            const percent = oneRoute.reduce((currentFee, pool) => currentFee.mul(new Unit(1).sub(new Unit(pool.fee).div(1000000))), new Unit(1));
            return pre.add(overallPercent.mul(new Unit(1).sub(percent)));
          }, new Unit(0));
          
          setBestTrade({
            state: TradeState.VALID,
            trade: {
              amountIn,
              amountOut,
              priceIn,
              priceOut,
              route,
              tradeType,
              networkFeeByAmount,
              priceImpact
            },
          });
        }
      });
  }, [tradeType, amount, tokenIn?.address, tokenOut?.address]);

  return bestTrade;
};

export const useBestTrade = useClientBestTrade;

/** undefined means loading */
export const useTokenPrice = (tokenAddress: string | undefined) => {
  const token = getWrapperTokenByAddress(tokenAddress);
  const result = useClientBestTrade(TradeType.EXACT_INPUT, '1', token, TokenUSDT);
  if (tokenAddress == TokenUSDT.address) return '1';
  if (!tokenAddress) return undefined;
  if (result.state === TradeState.LOADING) return undefined;
  if (result.state === TradeState.VALID) {
    return result.trade!.amountOut.toDecimalStandardUnit(undefined, TokenUSDT.decimals);
  }
  return null;
};

import { useEffect, useRef, useMemo } from 'react';
import { atomFamily, useRecoilState } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { uniqueId } from 'lodash-es';
import { getTokenByAddress, getWrapperTokenByAddress, TokenUSDT, isTokenEqual, type Token } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { targetChainId } from '@service/account';
import { useRoutingApi, getRoutingApiState } from '@service/settings';
import { FeeAmount, createPool } from '@service/pairs&pool';
import { getRouter, getClientSideQuote, Protocol } from '@service/pairs&pool/clientSideSmartOrderRouter';
import { isLocalDev } from '@utils/is';

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export interface Route {
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
  trade?: Trade;
}

export interface Trade {
  route: Route[][];
  amountIn: Unit;
  amountOut: Unit;
  priceIn: Unit;
  priceOut: Unit;
  networkFeeByAmount?: Unit;
  priceImpact: Unit;
  tradeType: TradeType;
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

interface FetchTradeParams {
  amountUnit: Unit;
  tokenInWrappered: Token;
  tokenOutWrappered: Token;
  tradeType: TradeType;
}

const fetchTradeWithClient = ({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType }: FetchTradeParams) => {
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
  return getClientSideQuote(args, router, CLIENT_PARAMS).then((res) => {
    if (res.data) {
      return res.data;
    } else {
      throw new Error('NO_ROUTE');
    }
  }).catch(err => {
    console.log('err', err);
    throw err;
  });
};

const fetchTradeWithServer = ({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType }: FetchTradeParams): ReturnType<typeof fetchTradeWithClient> =>
  fetch(
    `${isLocalDev ? '/prod' : 'https://cdnqxybj18.execute-api.ap-southeast-1.amazonaws.com/prod'}/quote?tokenInAddress=${tokenInWrappered.address}&tokenInChainId=${
      tokenInWrappered.chainId
    }&tokenOutAddress=${tokenOutWrappered.address}&tokenOutChainId=${tokenOutWrappered.chainId}&amount=${amountUnit.toDecimalMinUnit()}&type=${
      tradeType === TradeType.EXACT_INPUT ? 'exactIn' : 'exactOut'
    }`
  )
    .then((res) => res.json())
    .then((res) => {
      if (res?.errorCode) {
        if (res.errorCode === 'NO_ROUTE') {
          throw new Error('Failed to generate client side quote');
        } else {
          throw new Error(res.detail ?? res.errorCode);
        }
      }
      return res;
    });

export const fetchBestTrade = async ({
  tradeType,
  amount,
  tokenIn,
  tokenOut,
}: {
  tradeType: TradeType | null;
  amount: string;
  tokenIn: Token | null;
  tokenOut: Token | null;
}): Promise<BestTrade> => {
  const serverFirst = getRoutingApiState();
  const tokenInWrappered = getWrapperTokenByAddress(tokenIn?.address);
  const tokenOutWrappered = getWrapperTokenByAddress(tokenOut?.address);
  if (!amount || !tokenInWrappered || !tokenOutWrappered || tradeType === null || tokenInWrappered?.address === tokenOutWrappered?.address) {
    return { state: TradeState.INVALID };
  }
  const fetchByServer = () => fetchTradeWithServer({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType });
  const fetchByClient = () => fetchTradeWithClient({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType });
  const priorityMethod = serverFirst ? fetchByServer : fetchByClient;
  const secondaryMethod = serverFirst ? fetchByClient : fetchByServer;

  const amountUnit = Unit.fromStandardUnit(amount, tradeType === TradeType.EXACT_INPUT ? tokenInWrappered.decimals : tokenOutWrappered.decimals);
  const runFetch = async (fetchMethod: 'priorityMethod' | 'secondaryMethod'): Promise<BestTrade> => {
    try {
      let fetchPromise = (fetchMethod === 'priorityMethod' ? priorityMethod : secondaryMethod)();
      const res = await fetchPromise;

      return {
        state: TradeState.VALID,
        trade: calcTradeFromData({
          tradeType,
          amount,
          tokenIn: tokenInWrappered,
          tokenOut: tokenOutWrappered,
          amountUnit,
          res,
        }),
      };
    } catch (err) {
      const errStr = String(err);
      console.log('errStr', errStr);
      const isNoRoute = errStr?.includes('Failed to generate client side quote');
      const isNetworkError = errStr?.includes('Failed to fetch') || errStr?.includes('Failed to get');
      if (fetchMethod === 'priorityMethod' && isNetworkError) {
        return await runFetch('secondaryMethod');
      } else {
        return {
          state: TradeState.ERROR,
          error: isNoRoute ? 'No Valid Route Found, cannot swap.' : isNetworkError ? 'Network error, please try later.' : errStr,
        };
      }
    }
  };
  return runFetch('priorityMethod');
};

const bestTradeState = atomFamily<BestTrade, string>({
  default: { state: TradeState.INVALID },
  key: `bestTradeState-${import.meta.env.MODE}`,
});

export const setBestTradeState = (
  { tradeType, amount, tokenIn, tokenOut }: { tradeType: TradeType | null; amount: string; tokenIn: Token | null; tokenOut: Token | null },
  val: BestTrade
) => {
  const fetchKey = `${tokenIn?.address}-${tokenOut?.address}-${amount}-${tradeType}`;
  setRecoil(bestTradeState(fetchKey), val);
};

const bestTradeTracker = new Map<string, boolean>();
export const useBestTrade = (tradeType: TradeType | null, amount: string, tokenIn: Token | null, tokenOut: Token | null) => {
  const [serverFirst] = useRoutingApi();
  const uniqueIdFetchId = useRef<string>('init');
  const fetchKey = useMemo(() => `${tokenIn?.address}-${tokenOut?.address}-${amount}-${tradeType}`, [tokenIn?.address, tokenOut?.address, amount, tradeType]);
  const [bestTrade, setBestTrade] = useRecoilState<BestTrade>(bestTradeState(fetchKey));

  useEffect(() => {
    if (bestTradeTracker.has(fetchKey)) return;
    bestTradeTracker.set(fetchKey, true);
    const tokenInWrappered = getWrapperTokenByAddress(tokenIn?.address);
    const tokenOutWrappered = getWrapperTokenByAddress(tokenOut?.address);
    if (!amount || !tokenInWrappered || !tokenOutWrappered || tradeType === null || tokenInWrappered?.address === tokenOutWrappered?.address) {
      setBestTrade((pre) => (pre.state === TradeState.INVALID ? pre : { state: TradeState.INVALID }));
      return () => {
        bestTradeTracker.delete(fetchKey);
      };
    }

    uniqueIdFetchId.current = uniqueId('useServerBestTrade');
    const currentUniqueId = uniqueIdFetchId.current;
    const amountUnit = Unit.fromStandardUnit(amount, tradeType === TradeType.EXACT_INPUT ? tokenInWrappered.decimals : tokenOutWrappered.decimals);

    setBestTrade({ state: TradeState.LOADING });
    const fetchByServer = () => fetchTradeWithServer({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType });
    const fetchByClient = () => fetchTradeWithClient({ tokenInWrappered, tokenOutWrappered, amountUnit, tradeType });
    const priorityMethod = serverFirst ? fetchByServer : fetchByClient;
    const secondaryMethod = serverFirst ? fetchByClient : fetchByServer;

    const runFetch = async (fetchMethod: 'priorityMethod' | 'secondaryMethod') => {
      try {
        let fetchPromise = (fetchMethod === 'priorityMethod' ? priorityMethod : secondaryMethod)();
        const res = await fetchPromise;
        if (currentUniqueId !== uniqueIdFetchId.current) {
          return;
        }
        setBestTrade({
          state: TradeState.VALID,
          trade: calcTradeFromData({
            tradeType,
            amount,
            tokenIn: tokenInWrappered,
            tokenOut: tokenOutWrappered,
            amountUnit,
            res,
          }),
        });
      } catch (err) {
        const errStr = String(err);
        console.log('errStr', errStr);
        const isNoRoute = errStr?.includes('Failed to generate client side quote');
        const isNetworkError = errStr?.includes('Failed to fetch') || errStr?.includes('Failed to get') || errStr?.includes('SyntaxError') || errStr?.includes('Unexpected error');
        if (fetchMethod === 'priorityMethod' && isNetworkError) {
          runFetch('secondaryMethod');
        } else {
          setBestTrade({
            state: TradeState.ERROR,
            error: isNoRoute ? 'No Valid Route Found, cannot swap.' : isNetworkError ? 'Network error, please try later.' : errStr,
          });
        }
      }
    };

    runFetch('priorityMethod');
    return () => {
      bestTradeTracker.delete(fetchKey);
    };
  }, [fetchKey]);

  return bestTrade;
};

/** undefined means loading */
export const useTokenPrice = (tokenAddress: string | undefined, amount: string = '1') => {
  const token = getWrapperTokenByAddress(tokenAddress);
  const result = useBestTrade(TradeType.EXACT_INPUT, amount, token, TokenUSDT);
  if (tokenAddress === TokenUSDT?.address) return amount ? amount : undefined;
  if (!tokenAddress) return undefined;
  if (!amount) return undefined;
  if (result.state === TradeState.LOADING) return undefined;
  if (result.state === TradeState.VALID) {
    return result.trade!.amountOut.toDecimalStandardUnit(undefined, TokenUSDT.decimals);
  }
  return null;
};

export const getTokensPrice = async (tokenAddresses: string[], amount: string = '1'): Promise<{ [address: string]: string | null }> => {
  const pricePromises = tokenAddresses.map(async (tokenAddress) => {
    try {
      const token = getWrapperTokenByAddress(tokenAddress);
      // 如果是USDT，直接返回amount
      if (isTokenEqual(token, TokenUSDT)) {
        return { address: tokenAddress, price: amount || null };
      }

      // 如果tokenAddress为空或token不存在
      if (!tokenAddress || !token) {
        return { address: tokenAddress, price: null };
      }

      // 如果amount为空
      if (!amount) {
        return { address: tokenAddress, price: null };
      }

      // 获取交易结果
      const result = await fetchBestTrade({
        tradeType: TradeType.EXACT_INPUT,
        amount,
        tokenIn: token,
        tokenOut: TokenUSDT
      });

      if (result.state === TradeState.VALID) {
        const price = result.trade!.amountOut.toDecimalStandardUnit(undefined, TokenUSDT.decimals);
        return { address: tokenAddress, price };
      }

      return { address: tokenAddress, price: null };
    } catch (error) {
      console.warn(`Failed to fetch price for ${tokenAddress}:`, error);
      return { address: tokenAddress, price: null };
    }
  });

  const results = await Promise.all(pricePromises);
  const priceMap: { [address: string]: string | null } = {};

  results.forEach(({ address, price }) => {
    priceMap[address] = price;
  });

  return priceMap;
};

function calcTradeFromData({
  res,
  tradeType,
  amountUnit,
  tokenIn,
  tokenOut,
}: {
  res: any;
  tradeType: TradeType;
  amount: string;
  amountUnit: Unit;
  tokenIn: Token;
  tokenOut: Token;
}) {
  const route = res.route as Route[][];
  const amountIn = tradeType === TradeType.EXACT_INPUT ? amountUnit : Unit.fromMinUnit(res?.quote ?? 0);
  const amountOut = tradeType === TradeType.EXACT_INPUT ? Unit.fromMinUnit(res?.quote ?? 0) : amountUnit;

  const priceIn = amountIn.div(amountOut);
  const priceOut = amountOut.div(amountIn);

  const networkFeeByAmount = res?.gasUseEstimateUSD ? new Unit(res?.gasUseEstimateUSD) : undefined;

  const realizedLpFeePercent = route.reduce((pre, oneRoute) => {
    const overallPercent = new Unit(oneRoute.at(0)?.amountIn || 0).div(amountIn);
    const percent = oneRoute.reduce((currentFee, pool) => currentFee.mul(new Unit(1).sub(new Unit(pool.fee).div(1000000))), new Unit(1));
    return pre.add(overallPercent.mul(new Unit(1).sub(percent)));
  }, new Unit(0));

  let spotOutputAmount = new Unit(0);
  route.forEach((oneRoute) => {
    const thisRoutePools = oneRoute.map((poolData) =>
      createPool({
        tokenA: getTokenByAddress(poolData.tokenIn.address)!,
        tokenB: getTokenByAddress(poolData.tokenOut.address)!,
        fee: +poolData.fee as FeeAmount,
        tickCurrent: +poolData.tickCurrent,
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtRatioX96,
        farmingInfo: null,
      })
    );
    const midPrice = thisRoutePools.slice(1).reduce(
      ({ nextInput, price }, pool) => {
        return isTokenEqual(nextInput, pool.token0)
          ? {
              nextInput: pool.token1,
              price: price.mul(pool.token0Price!),
            }
          : {
              nextInput: pool.token0,
              price: price.mul(pool.token1Price!),
            };
      },
      isTokenEqual(thisRoutePools[0].token0, tokenIn)
        ? {
            nextInput: thisRoutePools[0].token1,
            price: thisRoutePools[0].token0Price!,
          }
        : {
            nextInput: thisRoutePools[0].token0,
            price: thisRoutePools[0].token1Price!,
          }
    ).price;
    spotOutputAmount = spotOutputAmount.add(new Unit(oneRoute.at(0)!.amountIn).mul(midPrice.mul(`1e${tokenOut.decimals - tokenIn.decimals}`)));
  });
  const _priceImpact = spotOutputAmount.sub(amountOut).div(spotOutputAmount);
  const priceImpact = _priceImpact.sub(realizedLpFeePercent);

  return {
    amountIn,
    amountOut,
    priceIn,
    priceOut,
    route,
    tradeType,
    networkFeeByAmount,
    priceImpact,
  };
}

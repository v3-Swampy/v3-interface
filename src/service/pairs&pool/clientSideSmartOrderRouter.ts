import { BigintIsh, Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import { RPC_PROVIDER } from '@utils/providers';
// This file is lazy-loaded, so the import of smart-order-router is intentional.
// eslint-disable-next-line no-restricted-imports
import { AlphaRouter, AlphaRouterConfig, ChainId, routeAmountsToString, SwapRoute } from 'v-swap-smart-order-router';
import JSBI from 'jsbi';
import { targetChainId } from '@service/account';
import { customBlockNumber } from '@utils/customBlockNumber';

type TokenInRoute = Pick<Token, 'address' | 'chainId' | 'symbol' | 'decimals'>;

export type V3PoolInRoute = {
  type: 'v3-pool';
  tokenIn: TokenInRoute;
  tokenOut: TokenInRoute;
  sqrtRatioX96: string;
  liquidity: string;
  tickCurrent: string;
  fee: string;
  amountIn?: string;
  amountOut?: string;

  // not used in the interface
  address?: string;
};

type V2Reserve = {
  token: TokenInRoute;
  quotient: string;
};

export type V2PoolInRoute = {
  type: 'v2-pool';
  tokenIn: TokenInRoute;
  tokenOut: TokenInRoute;
  reserve0: V2Reserve;
  reserve1: V2Reserve;
  amountIn?: string;
  amountOut?: string;

  // not used in the interface
  // avoid returning it from the client-side smart-order-router
  address?: string;
};

interface GetQuoteResult {
  quoteId?: string;
  blockNumber: string;
  amount: string;
  amountDecimals: string;
  gasPriceWei: string;
  gasUseEstimate: string;
  gasUseEstimateQuote: string;
  gasUseEstimateQuoteDecimals: string;
  gasUseEstimateUSD: string;
  methodParameters?: { calldata: string; value: string };
  quote: string;
  quoteDecimals: string;
  quoteGasAdjusted: string;
  quoteGasAdjustedDecimals: string;
  route: Array<(V3PoolInRoute | V2PoolInRoute)[]>;
  routeString: string;
}

export enum Protocol {
  V2 = 'V2',
  V3 = 'V3',
  MIXED = 'MIXED',
}

export function getRouter(): AlphaRouter {
  const router = new AlphaRouter({ chainId: Number(targetChainId), provider: RPC_PROVIDER });
  return router;
}

// from routing-api (https://github.com/Uniswap/routing-api/blob/main/lib/handlers/quote/quote.ts#L243-L311)
export function transformSwapRouteToGetQuoteResult(
  type: TradeType,
  amount: CurrencyAmount<Currency>,
  { quote, quoteGasAdjusted, route, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, gasPriceWei, methodParameters, blockNumber }: SwapRoute
): GetQuoteResult {
  const routeResponse: Array<(V3PoolInRoute | V2PoolInRoute)[]> = [];

  for (const subRoute of route) {
    const { amount, quote, tokenPath } = subRoute;

    const pools = subRoute.protocol === Protocol.V2 ? subRoute.route.pairs : subRoute.route.pools;
    const curRoute: (V3PoolInRoute | V2PoolInRoute)[] = [];
    for (let i = 0; i < pools.length; i++) {
      const nextPool = pools[i];
      const tokenIn = tokenPath[i];
      const tokenOut = tokenPath[i + 1];

      let edgeAmountIn = undefined;
      if (i === 0) {
        edgeAmountIn = type === TradeType.EXACT_INPUT ? amount.quotient.toString() : quote.quotient.toString();
      }

      let edgeAmountOut = undefined;
      if (i === pools.length - 1) {
        edgeAmountOut = type === TradeType.EXACT_INPUT ? quote.quotient.toString() : amount.quotient.toString();
      }

      if (nextPool instanceof Pool) {
        curRoute.push({
          type: 'v3-pool',
          tokenIn: {
            chainId: tokenIn.chainId,
            decimals: tokenIn.decimals,
            address: tokenIn.address,
            symbol: tokenIn.symbol,
          },
          tokenOut: {
            chainId: tokenOut.chainId,
            decimals: tokenOut.decimals,
            address: tokenOut.address,
            symbol: tokenOut.symbol,
          },
          fee: nextPool.fee.toString(),
          liquidity: nextPool.liquidity.toString(),
          sqrtRatioX96: nextPool.sqrtRatioX96.toString(),
          tickCurrent: nextPool.tickCurrent.toString(),
          amountIn: edgeAmountIn,
          amountOut: edgeAmountOut,
        });
      } else {
        const reserve0 = nextPool.reserve0;
        const reserve1 = nextPool.reserve1;

        curRoute.push({
          type: 'v2-pool',
          tokenIn: {
            chainId: tokenIn.chainId,
            decimals: tokenIn.decimals,
            address: tokenIn.address,
            symbol: tokenIn.symbol,
          },
          tokenOut: {
            chainId: tokenOut.chainId,
            decimals: tokenOut.decimals,
            address: tokenOut.address,
            symbol: tokenOut.symbol,
          },
          reserve0: {
            token: {
              chainId: reserve0.currency.wrapped.chainId,
              decimals: reserve0.currency.wrapped.decimals,
              address: reserve0.currency.wrapped.address,
              symbol: reserve0.currency.wrapped.symbol,
            },
            quotient: reserve0.quotient.toString(),
          },
          reserve1: {
            token: {
              chainId: reserve1.currency.wrapped.chainId,
              decimals: reserve1.currency.wrapped.decimals,
              address: reserve1.currency.wrapped.address,
              symbol: reserve1.currency.wrapped.symbol,
            },
            quotient: reserve1.quotient.toString(),
          },
          amountIn: edgeAmountIn,
          amountOut: edgeAmountOut,
        });
      }
    }

    routeResponse.push(curRoute);
  }

  const result: GetQuoteResult = {
    methodParameters,
    blockNumber: blockNumber.toString(),
    amount: amount.quotient.toString(),
    amountDecimals: amount.toExact(),
    quote: quote.quotient.toString(),
    quoteDecimals: quote.toExact(),
    quoteGasAdjusted: quoteGasAdjusted.quotient.toString(),
    quoteGasAdjustedDecimals: quoteGasAdjusted.toExact(),
    gasUseEstimateQuote: estimatedGasUsedQuoteToken.quotient.toString(),
    gasUseEstimateQuoteDecimals: estimatedGasUsedQuoteToken.toExact(),
    gasUseEstimate: estimatedGasUsed.toString(),
    gasUseEstimateUSD: estimatedGasUsedUSD.toExact(),
    gasPriceWei: gasPriceWei.toString(),
    route: routeResponse,
    routeString: routeAmountsToString(route),
  };

  return result;
}

async function getQuote(
  {
    type,
    tokenIn,
    tokenOut,
    amount: amountRaw,
  }: {
    type: TradeType;
    tokenIn: { address: string; chainId: number; decimals: number; symbol?: string };
    tokenOut: { address: string; chainId: number; decimals: number; symbol?: string };
    amount: BigintIsh;
  },
  router: AlphaRouter,
  config: Partial<AlphaRouterConfig>
): Promise<{ data: GetQuoteResult; error?: unknown }> {

  const enhancedConfig = config;
  if (customBlockNumber) {
    enhancedConfig.blockNumber = parseInt(customBlockNumber, 16);
  }

  const currencyIn = new Token(tokenIn.chainId, tokenIn.address, tokenIn.decimals, tokenIn.symbol);
  const currencyOut = new Token(tokenOut.chainId, tokenOut.address, tokenOut.decimals, tokenOut.symbol);

  const baseCurrency = type === TradeType.EXACT_INPUT ? currencyIn : currencyOut;
  const quoteCurrency = type === TradeType.EXACT_INPUT ? currencyOut : currencyIn;
  const amount = CurrencyAmount.fromRawAmount(baseCurrency, JSBI.BigInt(amountRaw));

  const swapRoute = await router.route(amount, quoteCurrency, type, /*swapConfig=*/ undefined, enhancedConfig);

  if (!swapRoute) throw new Error('Failed to generate client side quote');

  return { data: transformSwapRouteToGetQuoteResult(type, amount, swapRoute) };
}

interface QuoteArguments {
  tokenInAddress: string;
  tokenInChainId: ChainId;
  tokenInDecimals: number;
  tokenInSymbol?: string;
  tokenOutAddress: string;
  tokenOutChainId: ChainId;
  tokenOutDecimals: number;
  tokenOutSymbol?: string;
  amount: string;
  type: TradeType;
}

export async function getClientSideQuote(
  { tokenInAddress, tokenInChainId, tokenInDecimals, tokenInSymbol, tokenOutAddress, tokenOutChainId, tokenOutDecimals, tokenOutSymbol, amount, type }: QuoteArguments,
  router: AlphaRouter,
  config: Partial<AlphaRouterConfig>
) {
  return getQuote(
    {
      type,
      tokenIn: {
        address: tokenInAddress,
        chainId: tokenInChainId,
        decimals: tokenInDecimals,
        symbol: tokenInSymbol,
      },
      tokenOut: {
        address: tokenOutAddress,
        chainId: tokenOutChainId,
        decimals: tokenOutDecimals,
        symbol: tokenOutSymbol,
      },
      amount,
    },
    router,
    config
  );
}

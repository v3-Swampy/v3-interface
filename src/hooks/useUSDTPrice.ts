import { Currency, CurrencyAmount, Price, Token, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import {useTokenFromList} from '@hooks/useTokensBySymbols';
import { USDT_SYMBOL } from '@constants/token';
import { useBestV2Trade } from './useBestV2Trade'

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export function useUSDTPrice(currency?: Currency): Price<Currency, Token> | undefined {
  const chainId = currency?.chainId
  const currencyOut=useTokenFromList(USDT_SYMBOL)
  const STABLECOIN_AMOUNT_OUT=CurrencyAmount.fromRawAmount(currencyOut, 100_000e6)
  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT : undefined
  const stablecoin = amountOut?.currency
  // TODO(#2808): remove dependency on useBestV2Trade
  const v2USDTTrade = useBestV2Trade(TradeType.EXACT_OUTPUT, amountOut, currency, {
    maxHops: 2,
  })
  // console.log(v2USDTTrade?.route.path)

  return useMemo(() => {
    if (!currency || !stablecoin) {
      return undefined
    }

    // handle usdc
    if (currency?.wrapped.equals(stablecoin)) {
      return new Price(stablecoin, stablecoin, '1', '1')
    }

    // use v2 price if available, v3 as fallback
    if (v2USDTTrade) {
      const { numerator, denominator } = v2USDTTrade.route.midPrice
      return new Price(currency, stablecoin, denominator, numerator)
    }

    return undefined
  }, [currency, stablecoin, v2USDTTrade])
}



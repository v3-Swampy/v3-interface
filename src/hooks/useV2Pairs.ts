import { Interface } from '@ethersproject/abi'
import { Currency, CurrencyAmount,Token } from '@uniswap/sdk-core'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
// import { useMultipleContractSingleData } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import { Pair } from '@uniswap/v2-sdk'
import { UniswapV3Factory } from '@contracts/index';
import {computePoolAddress,FeeAmount} from '@service/pairs&pool'


const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export function useV2Pairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const tokens = useMemo(
    () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
    [currencies]
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) &&
          UniswapV3Factory.address
          ? computePoolAddress({ tokenA, tokenB,fee:FeeAmount.MEDIUM })
          : undefined
      }),
    [tokens]
  )

  console.info('pairAddresses', pairAddresses)

  // const results:any[] = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')
  // console.info('results', results)
  const abc:any={}
  return abc
  // console.log('@@@ useV2Pairs', results)
  // return useMemo(() => {
  //   return results.map((result, i) => {
  //     const { result: reserves, loading } = result
  //     const tokenA = tokens[i][0]
  //     const tokenB = tokens[i][1]

  //     if (loading) return [PairState.LOADING, null]
  //     if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
  //     if (!reserves) return [PairState.NOT_EXISTS, null]
  //     const { reserve0, reserve1 } = reserves
  //     const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
  //     return [
  //       PairState.EXISTS,
  //       new Pair(
  //         CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
  //         CurrencyAmount.fromRawAmount(token1, reserve1.toString())
  //       ),
  //     ]
  //   })
  // }, [results, tokens])
}

export function useV2Pair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  const inputs: [[Currency | undefined, Currency | undefined]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
  return useV2Pairs(inputs)[0]
}

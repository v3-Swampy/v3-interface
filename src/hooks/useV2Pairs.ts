import { Interface } from '@ethersproject/abi'
import { Currency, CurrencyAmount,Token } from '@uniswap/sdk-core'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useMemo,useEffect, useState } from 'react'
import { Pair } from '@uniswap-v2-sdk/index'
import {computePoolAddress,FeeAmount} from '@service/pairs&pool'
import { fetchMulticall,createERC20Contract } from '@contracts/index';


const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export function useV2Pairs(currencies: [Currency | undefined, Currency | undefined][],fee?:FeeAmount): [Pair | null][] {
  const tokens = useMemo(
    () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
    [currencies]
  )
  const tokenArr: Token[][]=[]  
  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        tokenArr.push([tokenA as Token,tokenB as Token])
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) 
          ? computePoolAddress({ tokenA, tokenB,fee:fee||FeeAmount.MEDIUM })
          : undefined
      }),
    [tokens]
  )
  let tokenAContract:any={}
  const callData=pairAddresses.map((pairAddress,index)=>{
    const tokens=tokenArr[index]
    const [tokenA,tokenB]=tokens
    tokenAContract=createERC20Contract(tokenA.address)
    const tokenBContract=createERC20Contract(tokenB.address)
    const callItem=[
      [tokenA.address,tokenAContract.func.encodeFunctionData('balanceOf',[pairAddress])],
      [tokenB.address,tokenBContract.func.encodeFunctionData('balanceOf',[pairAddress])]
    ]
    return callItem
  }).flat()


  const [multicalResults,setMulticallResults]=useState<Array<any>>([]);
  useEffect(() => {
    fetchMulticall(callData).then((res) => res?.map((data) => {
      return tokenAContract.func.decodeFunctionResult('balanceOf', data);
    })).then((res)=>{
      setMulticallResults(mergePairs(res||[]))
    })
  },[pairAddresses])
  return useMemo(()=>{
    return multicalResults.map((result,i)=>{
      const tokenA=tokenArr?.[i][0]
      const tokenB=tokenArr?.[i][1]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [null]
      const [reserve0,reserve1]=result
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return [
        new Pair(
          CurrencyAmount.fromRawAmount(token0, Number(reserve0||0).toString()),
          CurrencyAmount.fromRawAmount(token1, Number(reserve1||0).toString())
        ),
      ]
    })
  },[tokenArr])
  
}

function mergePairs(arr: any) {
  const merged = [];

  for (let i = 0; i < arr.length; i += 2) {
    merged.push([arr[i], arr[i + 1]]);
  }

  return merged;
}

export function useV2Pair(tokenA?: Currency, tokenB?: Currency): [Pair | null] {
  const inputs: [[Currency | undefined, Currency | undefined]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
  return useV2Pairs(inputs)[0]
}

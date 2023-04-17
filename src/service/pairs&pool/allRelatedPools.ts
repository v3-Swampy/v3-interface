import { useState, useEffect, useMemo } from 'react';
import { atom, useRecoilValue } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { handleTokensChange, getWrapperTokenByAddress, type Token } from '@service/tokens';
import { persistAtom, handleRecoilInit } from '@utils/recoilUtils';
import { createPoolContract, fetchMulticall } from '@contracts/index';
import { isEqual } from 'lodash-es';
import { isOdd } from '@utils/is';
import mergePairs from '@utils/mergePairs';
import computePoolAddress from './computePoolAddress';
import { FeeAmount, Pool } from './';

const baseCheckTradeTokenSymbols = ['WCFX', 'WBTC', 'USDT', 'ETH'];
const baseCheckTradeTokensState = atom<Array<Token>>({
  key: `baseCheckTradeTokensState-${import.meta.env.MODE}}`,
  default: [],
  effects: [persistAtom],
});

const useBaseCheckTradeTokens = () => useRecoilValue(baseCheckTradeTokensState);

const basePairsState = atom<Array<[Token, Token]>>({
  key: `basePairsState-${import.meta.env.MODE}}`,
  default: [],
  effects: [persistAtom],
});

const useBasePairs = () => useRecoilValue(basePairsState);

export const usePools = (tokenA: Token | null, tokenB: Token | null) => {
  const baseCheckTradeTokens = useBaseCheckTradeTokens();
  const basePairs = useBasePairs();
  const wrapperedTokenA = useMemo(() => getWrapperTokenByAddress(tokenA?.address), [tokenA]);
  const wrapperedTokenB = useMemo(() => getWrapperTokenByAddress(tokenB?.address), [tokenB]);

  const pairs = useMemo(() => {
    if (!wrapperedTokenA || !wrapperedTokenB) return [];

    return [
      // the direct pair
      [wrapperedTokenA, wrapperedTokenB] as [Token, Token],
      // token A against all bases
      ...baseCheckTradeTokens.map((base): [Token, Token] => [wrapperedTokenA, base]),
      // token B against all bases
      ...baseCheckTradeTokens.map((base): [Token, Token] => [wrapperedTokenB, base]),
      // each base against all bases
      ...basePairs,
    ]
      .filter(([t0, t1]) => !isEqual(t0, t1))
      .filter(([t0, t1], i, otherPairs) => {
        // find the first index in the array at which there are the same 2 tokens as the current
        const firstIndexInOtherPairs = otherPairs.findIndex(([t0Other, t1Other]) => {
          return (isEqual(t0, t0Other) && isEqual(t1, t1Other)) || (isEqual(t1, t0Other) && isEqual(t0, t1Other));
        });
        // only accept the first occurrence of the same 2 tokens
        // console.log(t0.symbol, t1.symbol, firstIndexInOtherPairs, otherPairs)
        return firstIndexInOtherPairs === i;
      });
  }, [wrapperedTokenA, wrapperedTokenB, basePairs]);

  const allTokenPairsWithAllFees = useMemo(
    () =>
      pairs.reduce<Array<{ tokenA: Token; tokenB: Token; fee: FeeAmount }>>(
        (list, [tokenA, tokenB]) =>
          list.concat([
            { tokenA, tokenB, fee: FeeAmount.LOW },
            { tokenA, tokenB, fee: FeeAmount.MEDIUM },
            { tokenA, tokenB, fee: FeeAmount.HIGH },
          ]),
        []
      ),
    [pairs]
  );

  const poolAddresses = useMemo(() => {
    return allTokenPairsWithAllFees.map((tokenPairWithFee) => computePoolAddress(tokenPairWithFee));
  }, [allTokenPairsWithAllFees]);

  const [validPools, setValidPools] = useState<Array<Pool>>([]);
  useEffect(() => {
    if (!poolAddresses?.length || !wrapperedTokenA || !wrapperedTokenB) return;
    const poolContracts = poolAddresses.map((address) => createPoolContract(address));

    fetchMulticall(
      poolContracts
        .map((poolContract) => [
          [poolContract.address, poolContract.func.interface.encodeFunctionData('slot0')],
          [poolContract.address, poolContract.func.interface.encodeFunctionData('liquidity')],
        ])
        .flat()
    )
      .then((res) =>
        res?.map((data, index) => {
          return data === '0x' ? null : poolContracts[Math.floor(index / 2)].func.interface.decodeFunctionResult(isOdd(index) ? 'liquidity' : 'slot0', data);
        })
      )
      .then((res) => mergePairs(res))
      .then((res) => {
        const pools: Array<Pool> = res?.map(
          (data, index) =>
            new Pool({
              ...allTokenPairsWithAllFees[index],
              address: poolAddresses[index],
              sqrtPriceX96: data?.[0]?.[0] ? data?.[0]?.[0].toString() : null,
              liquidity: data?.[1]?.[0] ? data?.[1]?.[0].toString() : null,
              tickCurrent: data?.[0]?.[1] ? +data?.[0]?.[1].toString() : null,
            })
        );

        if (!pools?.length) return;
        // console.log(pools);
        setValidPools(pools.filter((pool) => pool.sqrtPriceX96 && pool.liquidity && pool.sqrtPriceX96 !== '0' && pool.liquidity !== '0'));
      });
  }, [allTokenPairsWithAllFees]);
  console.log(validPools);
  return validPools;
};

const pairTokens = (tokens: Array<Token>, biDirectional: boolean = false) => {
  const result: Array<[Token, Token]> = [];
  let index = 0;
  for (let i = 0; i < tokens.length - 1; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      result[index++] = [tokens[i], tokens[j]];
      if (biDirectional) {
        result[index++] = [tokens[j], tokens[i]];
      }
    }
  }
  return result;
};

(function () {
  handleTokensChange((tokens) => {
    const baseCheckTradeTokens = tokens?.filter((token) => baseCheckTradeTokenSymbols.includes(token.symbol!)) ?? [];
    try {
      handleRecoilInit((set) => {
        set(baseCheckTradeTokensState, baseCheckTradeTokens);
        set(basePairsState, pairTokens(baseCheckTradeTokens, true));
      });
    } catch (_) {
      setRecoil(baseCheckTradeTokensState, baseCheckTradeTokens);
      setRecoil(basePairsState, pairTokens(baseCheckTradeTokens, true));
    }
  });
})();

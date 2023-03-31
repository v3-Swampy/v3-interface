import { useMemo } from 'react';
import { atom, useRecoilValue } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { handleTokensChange, type Token } from '@service/tokens';
import { persistAtom, handleRecoilInit } from '@utils/recoilUtils';
import { isEqual } from 'lodash-es';
import { computePoolAddress } from './test';
import { UniswapV3Factory } from '@contracts/index';

export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

const baseCheckTradeTokenSymbols = ['WCFX', 'WBTC', 'USDT', 'ETH'];
export const baseCheckTradeTokensState = atom<Array<Token>>({
  key: `baseCheckTradeTokensState-${import.meta.env.MODE}}`,
  default: [],
  effects: [persistAtom],
});

export const useBaseCheckTradeTokens = () => useRecoilValue(baseCheckTradeTokensState);

export const basePairsState = atom<Array<[Token, Token]>>({
  key: `basePairsState-${import.meta.env.MODE}}`,
  default: [],
  effects: [persistAtom],
});

export const useBasePairs = () => useRecoilValue(basePairsState);
export const usePairs = (sourceToken: Token | null, destinationToken: Token | null) => {
  const basePairs = useBasePairs();
  const baseCheckTradeTokens = useBaseCheckTradeTokens();

  const pairs = useMemo(() => {
    if (!sourceToken || !destinationToken) return [];

    // const tokens = [...baseCheckTradeTokens];
    // if (!tokens.find((token) => token.address === sourceToken.address)) tokens.push(sourceToken);
    // if (!tokens.find((token) => token.address === destinationToken.address)) tokens.push(destinationToken);
    // // const abc = pairTokens(tokens).map(([a, b]) => [a.symbol, b.symbol]);

    return [
      // the direct pair
      [sourceToken, destinationToken] as [Token, Token],
      // token A against all bases
      ...baseCheckTradeTokens.map((base): [Token, Token] => [sourceToken, base]),
      // token B against all bases
      ...baseCheckTradeTokens.map((base): [Token, Token] => [destinationToken, base]),
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
  }, [sourceToken, destinationToken, basePairs]);

  const allCurrencyCombinationsWithAllFees: [Token, Token, FeeAmount][] = useMemo(
    () =>
    pairs.reduce<[Token, Token, FeeAmount][]>((list, [tokenA, tokenB]) => {
        return list.concat([
          [tokenA, tokenB, FeeAmount.LOW],
          [tokenA, tokenB, FeeAmount.MEDIUM],
          [tokenA, tokenB, FeeAmount.HIGH],
        ]);
      }, []),
    [pairs]
  );

  const abc = useMemo(() => {
    return allCurrencyCombinationsWithAllFees.map(([a, b, c]) =>
      computePoolAddress({
        factoryAddress: UniswapV3Factory.address,
        tokenA: a,
        tokenB: b,
        fee: c,
      })
    );
  }, [allCurrencyCombinationsWithAllFees]);
  console.log(allCurrencyCombinationsWithAllFees);
  console.log(abc);
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
    const baseCheckTradeTokens = tokens?.filter((token) => baseCheckTradeTokenSymbols.includes(token.symbol)) ?? [];
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

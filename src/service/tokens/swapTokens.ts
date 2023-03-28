import { atom, useRecoilValue } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import LocalStorage from 'localstorage-enhance';
import { isEqual } from 'lodash-es';
import waitAsyncResult from '@utils/waitAsyncResult';
import { handleRecoilInit } from '@utils/recoilUtils';
import Cache from '@utils/LRUCache';

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  logoURI: string;
}

const tokensKey = `tokenState-${import.meta.env.MODE}`;

const cachedTokens = (LocalStorage.getItem(tokensKey, 'swap') as Array<Token>) ?? [];

export const tokensMap = new Map<string, Token>();
export const getTokenByAddress = (address?: string | null) => address ? (tokensMap.get(address) ?? null) : null;
const resetTokensMap = (tokens: Array<Token>) => {
  tokensMap.clear();
  tokens?.forEach((token) => {
    tokensMap.set(token.address, token);
  });
};
resetTokensMap(cachedTokens);

export const tokensState = atom<Array<Token>>({
  key: tokensKey,
  default: cachedTokens,
});

export const useTokens = () => useRecoilValue(tokensState);

const CommonTokensCount = 5;
const commonTokensCache = new Cache<Token>(CommonTokensCount - 1, 'swap-common-token');
const CFX = cachedTokens?.find((token) => token.address === 'CFX');
const commonTokensState = atom<Array<Token>>({
  key: `${tokensKey}-common`,
  default: [...(CFX ? [CFX] : []), ...commonTokensCache.toArr()],
});

export const useCommonTokens  = () => useRecoilValue(commonTokensState);
export const setCommonToken = (token: Token) => {
  if (token.address === 'CFX') return;
  commonTokensCache.set(token.address, token);
  setRecoil(commonTokensState, [...(CFX ? [CFX] : []), ...commonTokensCache.toArr()]);
}
export const deleteFromCommonTokens = (token: Token) => {
  if (token.address === 'CFX') return;
  if (!commonTokensCache.delete(token.address)) return;
  setRecoil(commonTokensState, [...(CFX ? [CFX] : []), ...commonTokensCache.toArr()]);
}

// init tokens data;
(async function () {
  const tokensURL =
    import.meta.env.MODE === 'development'
      ? 'https://raw.githubusercontent.com/v3-Swampy/token-list/dev/tokenList.testnet.json'
      : 'https://raw.githubusercontent.com/v3-Swampy/token-list/dev/tokenList.mainnet.json';
  try {
    const [p] = waitAsyncResult({
      fetcher: (): Promise<{ tokens: Array<Token> }> => fetch(tokensURL).then((res) => res.json()),
    });
    const { tokens } = await p;
    if (isEqual(tokens, cachedTokens)) return;
    try {
      LocalStorage.setItem({ key: tokensKey, data: tokens, namespace: 'swap' });
      handleRecoilInit((set) => {
        set(tokensState, tokens);
        resetTokensMap(tokens);
      });
    } catch (_) {
      setRecoil(tokensState, tokens);
      resetTokensMap(tokens);
    }
  } catch (err) {
    console.error('Failed to get the latest token list: ', err);
  }
})();

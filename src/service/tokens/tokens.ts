import { useMemo } from 'react';
import { atom, useRecoilValue } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
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

export let TokenVST: Token = null!;
export let TokenCFX: Token = {
  name: 'Conflux',
  symbol: 'CFX',
  decimals: 18,
  address: 'CFX',
  logoURI: '',
};

const setTokenVST = (tokens: Array<Token>) => {
  TokenVST = tokens?.find((token) => token.symbol === 'PPI')!; // TODO: chaozhou -- VST is not in the repository list now
  TokenCFX = tokens?.find((token) => token.symbol === 'CFX')!; // TODO: chaozhou -- VST is not in the repository list now
};
setTokenVST(cachedTokens);

const stableSymbols = ['USDT'];

const baseSymbols = ['WCFX', 'WBTC'];

export const stableTokens = stableSymbols.map((symbol) => cachedTokens.find((token) => token.symbol === symbol));
export const baseTokens = baseSymbols.map((symbol) => cachedTokens.find((token) => token.symbol === symbol));

const wrapperTokenMap = new Map<string, Token>();
const unwrapperTokenMap = new Map<string, Token>();
const tokensMap = new Map<string, Token>();
export const getTokenByAddress = (address?: string | null) => address ? (tokensMap.get(address.toLowerCase()) ?? null) : null;
export const getWrapperTokenByAddress = (address?: string | null) => address ? (wrapperTokenMap.get(address.toLowerCase()) ?? null) : null;
export const getUnwrapperTokenByAddress = (address?: string | null) => address ? (unwrapperTokenMap.get(address.toLowerCase()) ?? null) : null;
const tokensChangeCallbacks: Array<(tokens: Array<Token>) => void> = [];
const resetTokensMap = (tokens: Array<Token>) => {
  tokensChangeCallbacks?.forEach((callback) => callback?.(tokens));
  tokensMap.clear();

  const WCFX = tokens.find((token) => token.symbol === 'WCFX');
  const CFX = tokens.find((token) => token.symbol === 'CFX');
  tokens?.forEach((token) => {
    tokensMap.set(token.address.toLowerCase(), token);
    if (token.symbol !== 'CFX') {
      wrapperTokenMap.set(token.address.toLowerCase(), token);
    }
    if (token.symbol !== 'WCFX') {
      unwrapperTokenMap.set(token.address.toLowerCase(), token);
    }
  });
  if (CFX && WCFX) {
    wrapperTokenMap.set(CFX.address.toLowerCase(), WCFX);
    unwrapperTokenMap.set(WCFX.address.toLowerCase(), CFX);
  }

  setTokenVST(tokens);
};
resetTokensMap(cachedTokens);

export const handleTokensChange = (callback: (tokens: Array<Token>) => void) => {
  if (typeof callback !== 'function') return;
  tokensChangeCallbacks.push(callback);
  let tokens!: Array<Token>;
  try {
    tokens = getRecoil(tokensState);
  } catch (_) {
    tokens = cachedTokens;
  } finally {
    callback(tokens);
  }
};

export const tokensState = atom<Array<Token>>({
  key: tokensKey,
  default: cachedTokens,
});

export const useTokens = () => {
  const tokens = useRecoilValue(tokensState);
  const tokensWithoutWCFX = useMemo(() => tokens?.filter((token) => token.symbol !== 'WCFX'), [tokens]);
  return tokensWithoutWCFX
}

const CommonTokensCount = 5;
const commonTokensCache = new Cache<Token>(CommonTokensCount - 1, 'swap-common-token');
const commonTokensState = atom<Array<Token>>({
  key: `${tokensKey}-common`,
  default: [TokenCFX, ...commonTokensCache.toArr()],
});

export const useCommonTokens = () => useRecoilValue(commonTokensState);

export const setCommonToken = (token: Token) => {
  if (!getTokenByAddress(token.address)) {
    deleteFromCommonTokens(token);
    return;
  }
  if (token.address === 'CFX') return;
  commonTokensCache.set(token.address, token);
  setRecoil(commonTokensState, [TokenCFX, ...commonTokensCache.toArr()]);
};

export const deleteFromCommonTokens = (token: Token) => {
  if (token.address === 'CFX') return;
  if (!commonTokensCache.delete(token.address)) return;
  setRecoil(commonTokensState, [TokenCFX, ...commonTokensCache.toArr()]);
};

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

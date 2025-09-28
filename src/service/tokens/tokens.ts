import { useMemo } from 'react';
import { atom, useRecoilValue, type SetRecoilState } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import LocalStorage from 'localstorage-enhance';
import { isEqual } from 'lodash-es';
import { targetChainId } from '@service/account';
import waitAsyncResult from '@utils/waitAsyncResult';
import { handleRecoilInit } from '@utils/recoilUtils';
import { createERC20Contract, fetchMulticall } from '@contracts/index';
import TokenDefaultIcon from '@assets/icons/token_default.png';
import Cache from '@utils/LRUCache';
import { isMobile } from '@utils/is';

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  logoURI?: string;
  chainId?: number;
  fromSearch?: true;
}

const tokensKey = `tokenState-${import.meta.env.MODE}`;

let resolveTokenInit: (value: unknown) => void = null!;
export const tokenInitPromise = new Promise((resolve) => {
  resolveTokenInit = resolve;
});

const cachedTokens = (LocalStorage.getItem(tokensKey, 'tokens') as Array<Token>) ?? [];
if (cachedTokens?.length) {
  resolveTokenInit(true);
}

export let TokenVST: Token = null!;
export let TokenUSDT: Token = null!;
export let TokenETH: Token = null!;
export let TokenCFX: Token = {
  chainId: +targetChainId,
  name: 'Conflux Network',
  symbol: 'CFX',
  decimals: 18,
  address: 'CFX',
  logoURI: TokenDefaultIcon,
};

const setRegularToken = (tokens: Array<Token>) => {
  TokenVST = tokens?.find((token) => token.symbol === 'VST')!;
  TokenCFX = tokens?.find((token) => token.symbol === 'CFX')!;
  TokenUSDT = tokens?.find((token) => token.symbol === 'USDT')!;
  TokenETH = tokens?.find((token) => token.symbol === 'ETH')!;
};
setRegularToken(cachedTokens);

export const tokensState = atom<Array<Token>>({
  key: tokensKey,
  default: cachedTokens,
});

const CommonTokensCount = isMobile ? 4 : 5;
const commonTokensCache = new Cache<Token>(CommonTokensCount - 1, 'swap-common-token');
const commonTokensState = atom<Array<Token>>({
  key: `${tokensKey}-common`,
  default: [...(TokenCFX ? [TokenCFX] : []), ...commonTokensCache.toArr()],
});

export const useCommonTokens = () => useRecoilValue(commonTokensState);
export const getCommonTokens = () => getRecoil(commonTokensState);

export const setCommonToken = (token: Token) => {
  if (!getTokenByAddress(token.address)) {
    deleteFromCommonTokens(token);
    return;
  }
  if (token.address === 'CFX') return;
  commonTokensCache.set(token.address, token);
  setRecoil(commonTokensState, [...(TokenCFX ? [TokenCFX] : []), ...commonTokensCache.toArr()]);
};

export const deleteFromCommonTokens = (token: Token, setRecoilState?: SetRecoilState) => {
  if (token.address === 'CFX') return;
  if (!commonTokensCache.delete(token.address)) return;
  (setRecoilState ?? setRecoil)(commonTokensState, [...(TokenCFX ? [TokenCFX] : []), ...commonTokensCache.toArr()]);
};

const stableSymbols = ['USDT'];
const baseSymbols = ['WCFX', 'WBTC'];

export const stableTokens = stableSymbols.map((symbol) => cachedTokens.find((token) => token.symbol === symbol));
export const baseTokens = baseSymbols.map((symbol) => cachedTokens.find((token) => token.symbol === symbol));
export const VST = cachedTokens.find((token) => token.symbol === 'VST');

const wrapperTokenMap = new Map<string, Token>();
const unwrapperTokenMap = new Map<string, Token>();
const tokensMap = new Map<string, Token>();
export const getTokenByAddress = (address?: string | null) => (address ? tokensMap.get(address.toLowerCase()) ?? null : null);
export const getWrapperTokenByAddress = (address?: string | null) => (address ? wrapperTokenMap.get(address.toLowerCase()) ?? null : null);
export const getUnwrapperTokenByAddress = (address?: string | null) => (address ? unwrapperTokenMap.get(address.toLowerCase()) ?? null : null);
const tokensChangeCallbacks: Array<(tokens: Array<Token>) => void> = [];
const resetTokensMap = (tokens: Array<Token>, setRecoilState?: SetRecoilState) => {
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

  setRegularToken(tokens);

  try {
    const commonTokensNow = commonTokensCache.toArr();
    commonTokensNow.forEach((commonToken) => {
      if (!tokens?.find((token) => token.address === commonToken.address)) {
        deleteFromCommonTokens(commonToken, setRecoilState);
      }
    });
  } catch (_) {}
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

export const useTokens = () => {
  const tokens = useRecoilValue(tokensState);
  const tokensWithoutWCFX = useMemo(() => tokens?.filter((token) => token.symbol !== 'WCFX'), [tokens]);
  return tokensWithoutWCFX;
};

// init tokens data;
(async function () {
  const tokensURL = `${import.meta.env.VITE_TokenListConfigUrl}`;
  try {
    const [p, stop, getStatus] = waitAsyncResult({
      fetcher: (): Promise<{ tokens: Array<Token> }> => fetch(tokensURL).then((res) => res.json()),
    });
    const { tokens } = await p;
    const innerTokens = cachedTokens.filter((token) => !token.fromSearch);
    const searchedTokens = cachedTokens.filter((token) => token.fromSearch);
    if (isEqual(tokens, innerTokens)) return;
    const newTokens = [...tokens, ...searchedTokens];
    try {
      LocalStorage.setItem({ key: tokensKey, data: newTokens, namespace: 'tokens' });
      handleRecoilInit((set) => {
        set(tokensState, newTokens);
        resetTokensMap(newTokens, set);
      });
    } catch (_) {
      setRecoil(tokensState, newTokens);
      resetTokensMap(newTokens);
    } finally {
      resolveTokenInit(true);
    }
  } catch (err) {
    console.error('Failed to get the latest token list: ', err);
  }
})();

const fetchTokenInfos = ['name', 'symbol', 'decimals'] as const;
export const fetchTokenInfoByAddress = async (address: string) => {
  try {
    const tokenContract = createERC20Contract(address);
    const encodedRes = await fetchMulticall(fetchTokenInfos.map((info) => [tokenContract.address, tokenContract.func.interface.encodeFunctionData(info)]));

    if (Array.isArray(encodedRes)) {
      const decodeRes = encodedRes?.map((encodedInfo, index) => tokenContract.func.interface.decodeFunctionResult(fetchTokenInfos[index], encodedInfo)?.[0]);
      if (decodeRes[1] === 'WCFX') return null;
      return {
        name: decodeRes[0],
        symbol: decodeRes[1],
        decimals: Number(decodeRes[2]),
        address: address,
        logoURI: TokenDefaultIcon,
        chainId: +targetChainId,
      } as Token;
    }
  } catch (_) {
    return null;
  }
};

export const addTokenToList = async (targetToken: Token) => {
  const tokens = getRecoil(tokensState);
  if (!targetToken || tokens?.find((token) => targetToken.address === token.address)) return;
  const newTokens = [...tokens, { ...targetToken, fromSearch: true } as Token];
  LocalStorage.setItem({ key: tokensKey, data: newTokens, namespace: 'tokens' });
  setRecoil(tokensState, newTokens);
  resetTokensMap(newTokens);
};

export const deleteTokenFromList = (targetToken: Token) => {
  const tokens = getRecoil(tokensState);
  if (!targetToken || !tokens?.find((token) => targetToken.address === token.address)) return;
  const newTokens = tokens.filter((token) => token.address !== targetToken.address);
  LocalStorage.setItem({ key: tokensKey, data: newTokens, namespace: 'tokens' });
  setRecoil(tokensState, newTokens);
  resetTokensMap(newTokens);
};

export const isTokenEqual = (tokenA: Token | null | undefined, tokenB: Token | null | undefined) => {
  if ((tokenA && !tokenB) || (!tokenA && tokenB)) return false;
  if ((tokenA === null && tokenB === undefined) || (tokenA === undefined && tokenB === null)) return false;
  if (!tokenA && !tokenB) return true;
  return getUnwrapperTokenByAddress(tokenA?.address)?.address?.toLocaleLowerCase() === getUnwrapperTokenByAddress(tokenB?.address)?.address?.toLocaleLowerCase();
};


export const getToken0And1 = (tokenA: Token | null | undefined, tokenB: Token | null | undefined) => {
  if (!tokenA || !tokenB) return [tokenA, tokenB];
  const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
  return notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA];
}


export const getTokenByAddressWithAutoFetch = async (address: string) => {
  const token = getTokenByAddress(address);
  if (token) return token;
  const tokenInfo = await fetchTokenInfoByAddress(address);
  if (tokenInfo) {
    addTokenToList(tokenInfo);
    return tokenInfo;
  }
  return null;
};
import { atom, useRecoilValue } from 'recoil';

const defaultTokens = [
  {
    name: 'Conflux Network',
    symbol: 'CFX',
    decimals: 18,
    address: 'CFX',
  },
  {
    name: 'Ethereum',
    symbol: 'Eth',
    decimals: 18,
    address: 'Eth',
  },
  {
    name: 'Daidaiwo',
    symbol: 'DAI',
    decimals: 18,
    address: 'DAI',
  },
  {
    name: 'Aergogogo',
    symbol: 'Aergo',
    decimals: 18,
    address: 'Aergo',
  },
];

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

export const tokensState = atom<Array<Token>>({
  key: `tokenState-${import.meta.env.MODE}`,
  default: defaultTokens,
  effects: [
    ({ onSet }) => {
      resetTokensMap(defaultTokens);
      onSet(resetTokensMap);
    },
  ],
});

export const tokensMap = new Map<string, Token>();
export const getTokenByAddress = (address: string) => tokensMap.get(address) ?? null;
const resetTokensMap = (tokens: Array<Token>) => {
  tokensMap.clear();
  tokens?.forEach((token) => {
    tokensMap.set(token.address, token);
  });
};

export const useTokens = () => useRecoilValue(tokensState);

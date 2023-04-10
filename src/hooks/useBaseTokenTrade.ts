import { useTokens } from '@service/tokens';
import { useMemo } from 'react';

const BASE_TRADE_TOKENS: string[] = ['PPI', 'USDT'];

export function useBaseTokenTrade(): any {
  const tokens = useTokens();
  return useMemo(() => tokens.filter((token) => BASE_TRADE_TOKENS.indexOf(token.symbol) != -1), [tokens]);
}

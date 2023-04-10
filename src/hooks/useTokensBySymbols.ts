import { useTokens } from '@service/tokens';
import { useMemo } from 'react';
import { Token } from '@uniswap/sdk-core'


const BASE_TRADE_TOKENS: string[] = ['USDT','WCFX'];

/**
 * 
 * @param symbols The symbols that you want to filter from the TokenList : ;
 * @returns 
 */
export function useTokensBySymbols(symbols:string[]): any {
  const tokens = useTokens();
  return useMemo(() => tokens.filter((token) => symbols.indexOf(token.symbol as string) != -1), [tokens]);
}

export function useBaseTokensTrade(){
  const tokens=useTokensBySymbols(BASE_TRADE_TOKENS)
  console.info('tokens',tokens)
  return tokens.map((token: any)=>_tranferToToken(token))
}

export function useTokenFromList(symbol:string):Token{
  const [tokenObject]=useTokensBySymbols([symbol])
  return _tranferToToken(tokenObject)
}

function _tranferToToken(tokenObject:Token):Token{
  const {chainId,address,decimals,symbol:sym,name}=tokenObject
  return new Token(chainId,address,decimals,sym,name)
}


export default useTokensBySymbols

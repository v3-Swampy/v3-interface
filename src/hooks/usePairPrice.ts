import { useUSDTPrice } from './useUSDTPrice';
import { useTokenFromList } from './useTokensBySymbols';
import { VST_SYMBOL } from '@constants/token';

export function useVSTPrice(): number | null | undefined {
  //TODO: For testing, remember to change the symbol.
  const currencyIn = useTokenFromList('PPI');
  const price = useUSDTPrice(currencyIn);
  return price ? +price.toSignificant(18) : null;
}

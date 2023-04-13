import { useUSDTPrice } from './useUSDTPrice';
import { useTokenFromList } from './useTokensBySymbols';
import { VST_SYMBOL } from '@constants/token';
import {FeeAmount} from '@service/pairs&pool'

export function useVSTPrice(fee?:FeeAmount): number | null | undefined {
  //TODO: For testing, remember to change the symbol.
  const currencyIn = useTokenFromList('PPI');
  const price = useUSDTPrice(currencyIn,fee);
  return price ? +price.toSignificant(18) : null;
}

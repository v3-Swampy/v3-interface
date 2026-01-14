import { getTokensPrice } from '@service/pairs&pool';
import { uniq } from 'lodash-es';
import { atom, useRecoilState } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';

const tokensPriceState = atom<Record<string, string | undefined | null>>({
  key: `tokensPriceState-${import.meta.env.MODE}`,
  default: {},
});

/** TODO: only for positions reward tokens now */
export const useTokensPriceState = () => useRecoilState(tokensPriceState);
/** TODO: only for positions reward tokens now */
export const getTokensPriceState = () => getRecoil(tokensPriceState);
export const setTokensPriceState = async (_tokenAddresses: string[]) => {
  try {
    const tokenAddresses = uniq(_tokenAddresses);
    const priceMap = await getTokensPrice(tokenAddresses);
    setRecoil(tokensPriceState, (prev) => ({
      ...prev,
      ...priceMap,
    }));
    return priceMap;
  } catch (error) {
    console.log('set tokens price error', error);
  }
};

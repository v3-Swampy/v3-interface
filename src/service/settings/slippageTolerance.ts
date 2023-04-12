import { atom, useRecoilValue } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';

/**
 * The swap and liquidity pages have different default Slippage Tolerance.
 * But when ever the Slippage Tolerance has been set manually, both pages will use the manual setting.
 */

const AddLiquidityDefaultSlippageTolerance = 0.005;
const SwapDefaultSlippageTolerance = 0.001;

const slippageToleranceMethod = atom<'auto' | 'manual'>({
  key: `slippageToleranceMethod-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault('auto')],
});

const slippageToleranceState = atom<number>({
  key: `slippageToleranceState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(AddLiquidityDefaultSlippageTolerance)],
});

export const toggleSlippageToleranceMethod = () => {
  setRecoil(slippageToleranceMethod, pre => pre === 'auto' ? 'manual' : 'auto');
};

/**
 * Automatic conversion to percentage units, value * 100
 */
export const useSlippageTolerance = () => {
  const value = useRecoilValue(slippageToleranceState);
  const method = useRecoilValue(slippageToleranceMethod);

  if (method === 'auto') {
    if (location.pathname?.startsWith('/swap')) {
      return { method, value: SwapDefaultSlippageTolerance * 100 };
    } else {
      return { method, value: AddLiquidityDefaultSlippageTolerance * 100 };
    }
  } else {
    return { method, value: value * 100 };
  }
};

export const setSlippageTolerance = (value: number) => {
  setRecoil(slippageToleranceState, (+value) / 100);
  setRecoil(slippageToleranceMethod, 'manual');
};

/**
 * Unlike useSlippageTolerance which needs to be synchronized into ui where the input box is automatically converted into percentage units.
 * getSlippageTolerance is used directly in the calculation of data without converting units.
 */
export const getSlippageTolerance = () => {
  const method = getRecoil(slippageToleranceMethod);
  if (method === 'auto') {
    if (location.pathname?.startsWith('/swap')) {
      return SwapDefaultSlippageTolerance;
    } else {
      return AddLiquidityDefaultSlippageTolerance;
    }
  } else {
    return getRecoil(slippageToleranceState);
  }
};

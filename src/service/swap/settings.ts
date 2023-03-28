import { atom, useRecoilValue } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';

/** <--------------- Settings -----------------> */
const slippageToleranceState = atom<number>({
  key: `slippageToleranceState-${import.meta.env.MODE}`,
  default: 0.10,
})

export const useSlippageTolerance = () => useRecoilValue(slippageToleranceState);
export const setSlippageTolerance = () => {
  setRecoil(slippageToleranceState, 0.10);
  const autoSlippageTolerance = getRecoil(autoSlippageToleranceState);
  if (!autoSlippageTolerance.enable) {
    setRecoil(autoSlippageToleranceState, pre => ({ ...pre, enable: false }));
  }
}

const autoSlippageToleranceState = atom<{ enable: boolean; value: number; }>({
  key: `autoSlippageToleranceState-${import.meta.env.MODE}`,
  default: {
    enable: true,
    value: 0.10
  },
})

export const useAutoSlippageToleranceState = () => useRecoilValue(autoSlippageToleranceState);


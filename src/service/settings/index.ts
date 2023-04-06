import { atom, useRecoilValue, useRecoilState } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';

const slippageToleranceState = atom<number>({
  key: `slippageToleranceState-${import.meta.env.MODE}`,
  default: 0.1,
});

export const useSlippageTolerance = () => useRecoilValue(slippageToleranceState);
export const setSlippageTolerance = () => {
  setRecoil(slippageToleranceState, 0.1);
  const autoSlippageTolerance = getRecoil(autoSlippageToleranceState);
  if (!autoSlippageTolerance.enable) {
    setRecoil(autoSlippageToleranceState, (pre) => ({ ...pre, enable: false }));
  }
};

const autoSlippageToleranceState = atom<{ enable: boolean; value: number }>({
  key: `autoSlippageToleranceState-${import.meta.env.MODE}`,
  default: {
    enable: true,
    value: 0.1,
  },
});

export const useAutoSlippageToleranceState = () => useRecoilValue(autoSlippageToleranceState);

/** unit minute */
const transactionDeadlineState = atom<number>({
  key: `transactionDeadlineState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(30)],
});

export const useTransactionDeadline = () => useRecoilState(transactionDeadlineState);
export const getTransactionDeadline = () => getRecoil(transactionDeadlineState);

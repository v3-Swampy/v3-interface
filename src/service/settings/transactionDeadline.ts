import { atom, useRecoilState } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';

/** unit minute */
const transactionDeadlineState = atom<number>({
  key: `transactionDeadlineState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(30)],
});

export const useTransactionDeadline = () => useRecoilState(transactionDeadlineState);
export const getTransactionDeadline = () => getRecoil(transactionDeadlineState);

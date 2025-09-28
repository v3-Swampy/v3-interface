import { atom, useRecoilState } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import { persistAtomWithDefault } from '@utils/recoilUtils';

dayjs.extend(durationPlugin);
const duration = dayjs.duration;

/** unit minute */
const transactionDeadlineState = atom<number>({
  key: `transactionDeadlineState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(30)],
});

export const useTransactionDeadline = () => useRecoilState(transactionDeadlineState);
export const getTransactionDeadlineState = () => getRecoil(transactionDeadlineState);
export const getDeadline = () => dayjs().add(duration(getTransactionDeadlineState(), 'minute')).unix();

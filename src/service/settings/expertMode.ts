import { atom, useRecoilState } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';

/** unit minute */
const expertModeState = atom<boolean>({
  key: `expertModeState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(false)],
});

export const useExpertMode = () => useRecoilState(expertModeState);
export const getExpertModeState = () => getRecoil(expertModeState);

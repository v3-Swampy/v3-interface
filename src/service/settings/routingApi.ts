import { atom, useRecoilState } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';

/** unit minute */
const routingApiState = atom<boolean>({
  key: `expertModeState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(true)],
});

export const useRoutingApi = () => useRecoilState(routingApiState);
export const getRoutingApiState = () => getRecoil(routingApiState);

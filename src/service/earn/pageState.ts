import { atom, useRecoilState } from 'recoil';
import { getRecoil } from 'recoil-nexus';

const farmsOnlyState = atom<boolean>({
  key: `farmsOnlyState-${import.meta.env.MODE}`,
  default: false,
});

export const useFarmsOnly = () => useRecoilState(farmsOnlyState);
export const getFarmsOnlyState = () => getRecoil(farmsOnlyState);

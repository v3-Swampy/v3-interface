import { atomFamily, useRecoilState } from 'recoil';
import { setRecoil } from 'recoil-nexus';

export const invertedState = atomFamily({ key: 'SelectedPriceRange-inverted', default: false });
export const setInvertedState = (tokenId: string | number, state: boolean) => setRecoil(invertedState(tokenId), state);
export const useInvertedState = (tokenId: string | number | undefined) => {
  // tokenId may from uniqueId
  const numTokenId = Number(tokenId);
  const isFromUniqueId = Number.isNaN(numTokenId);
  return useRecoilState(invertedState(isFromUniqueId ? tokenId : numTokenId));
};

import { atom, useRecoilValue } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { getTokenByAddress, type Token } from '@service/tokens';

/** <--------------- Two-lane Data-Binding TokenAddressState & URLSearchParams -----------------> */
const getValidTokenBySearchParams = (type: 'sourceToken' | 'destinationToken') => {
  const searchParams = new URLSearchParams(location.search);
  const tokenAddress = searchParams.get(type);
  return tokenAddress && !!getTokenByAddress(tokenAddress) ? tokenAddress : null;
};

const updateTokenInSearchParams = ({ type, tokenAddress }: { type: 'sourceToken' | 'destinationToken'; tokenAddress: string | null }) => {
  const url = new URL(location.search);
  if (!tokenAddress) {
    url.searchParams.delete(type);
  } else {
    url.searchParams.set(type, tokenAddress);
  }
};



/** <--------------- Source Token -----------------> */
export const sourceTokenAddressState = atom<string | null>({
  key: `sourceTokenAddressState-${import.meta.env.MODE}`,
  default: null,
  effects: [
    ({ onSet, setSelf }) => {
      setSelf(getValidTokenBySearchParams('sourceToken'));
      onSet((newSourceTokenAddress) => updateTokenInSearchParams({ type: 'sourceToken', tokenAddress: newSourceTokenAddress }));
    },
  ],
});

export const useSourceToken = () => {
  const tokenAddress = useRecoilValue(sourceTokenAddressState);
  if (!tokenAddress) return null;
  return getTokenByAddress(tokenAddress);
};



/** <--------------- Destination Token -----------------> */
export const destinationTokenAddressState = atom<string | null>({
  key: `destinationTokenAddressState-${import.meta.env.MODE}`,
  default: null,
  effects: [
    ({ onSet, setSelf }) => {
      setSelf(getValidTokenBySearchParams('destinationToken'));
      onSet((newDestinationToken) => updateTokenInSearchParams({ type: 'destinationToken', tokenAddress: newDestinationToken }));
    },
  ],
});

export const useDestinationToken = () => {
  const tokenAddress = useRecoilValue(destinationTokenAddressState);
  if (!tokenAddress) return null;
  return getTokenByAddress(tokenAddress);
};



/** <--------------- Token Operate -----------------> */
export const setToken = ({ type, token }: { type: 'source' | 'destination'; token: Token }) => {
  const tokenState = type === 'source' ? sourceTokenAddressState : destinationTokenAddressState;

  if (!getTokenByAddress(token.address)) {
    setRecoil(tokenState, null);
    return;
  }

  setRecoil(tokenState, token.address);
};

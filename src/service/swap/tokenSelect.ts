import { atom, useRecoilValue } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { getTokenByAddress, type Token } from '@service/tokens';

/** <--------------- Two-lane Data-Binding TokenAddressState & URLSearchParams -----------------> */
const getValidTokenBySearchParams = (type: 'sourceToken' | 'destinationToken') => {
  const url = new URL(location.href);
  const tokenAddress = url.searchParams.get(type);
  return tokenAddress && !!getTokenByAddress(tokenAddress) ? tokenAddress : null;
};

const updateTokenInSearchParams = ({ type, tokenAddress }: { type: 'sourceToken' | 'destinationToken'; tokenAddress: string | null }) => {
  const url = new URL(location.href);
  if (!tokenAddress) {
    url.searchParams.delete(type);
  } else {
    if (url.searchParams.has(type)) {
      url.searchParams.set(type, tokenAddress);
    } else {
      url.searchParams.append(type, tokenAddress);
    }
  }
  const newUrl = url.toString();
  history.replaceState(null, '', newUrl);
};

/** <--------------- Source Token -----------------> */
export const sourceTokenAddressState = atom<string | null>({
  key: `sourceTokenAddressState-${import.meta.env.MODE}`,
  default: null,
  effects: [
    ({ onSet, setSelf }) => {
      // If no token is given from searchParams, set sourceToken to CFX.
      const sourceTokenFromSearchParams = getValidTokenBySearchParams('sourceToken');
      if (!sourceTokenFromSearchParams && !getValidTokenBySearchParams('destinationToken')) {
        setSelf('CFX');
        updateTokenInSearchParams({ type: 'sourceToken', tokenAddress: 'CFX' });
      } else {
        setSelf(sourceTokenFromSearchParams);
        if (!sourceTokenFromSearchParams) {
          updateTokenInSearchParams({ type: 'sourceToken', tokenAddress: null });
        }
      }

      onSet((newSourceTokenAddress) => updateTokenInSearchParams({ type: 'sourceToken', tokenAddress: newSourceTokenAddress }));
    },
  ],
});

export const useSourceToken = () => {
  const tokenAddress = useRecoilValue(sourceTokenAddressState);
  if (!tokenAddress) return null;
  return getTokenByAddress(tokenAddress);
};
export const getSourceToken = () => getTokenByAddress(getRecoil(sourceTokenAddressState));

/** <--------------- Destination Token -----------------> */
export const destinationTokenAddressState = atom<string | null>({
  key: `destinationTokenAddressState-${import.meta.env.MODE}`,
  default: null,
  effects: [
    ({ onSet, setSelf }) => {
      const destinationTokenFromSearchParams = getValidTokenBySearchParams('destinationToken');
      setSelf(destinationTokenFromSearchParams);
      if (!destinationTokenFromSearchParams) {
        updateTokenInSearchParams({ type: 'destinationToken', tokenAddress: null });
      }
      onSet((newDestinationToken) => updateTokenInSearchParams({ type: 'destinationToken', tokenAddress: newDestinationToken }));
    },
  ],
});

export const useDestinationToken = () => {
  const tokenAddress = useRecoilValue(destinationTokenAddressState);
  if (!tokenAddress) return null;
  return getTokenByAddress(tokenAddress);
};

export const getDestinationToken = () => getTokenByAddress(getRecoil(destinationTokenAddressState));

/** <--------------- Token Operate -----------------> */
export const exchangeTokenDirection = () => {
  const sourceTokenAddress = getRecoil(sourceTokenAddressState);
  const destinationTokenAddress = getRecoil(destinationTokenAddressState);
  setRecoil(sourceTokenAddressState, destinationTokenAddress);
  setRecoil(destinationTokenAddressState, sourceTokenAddress);
};

export const setToken = ({ type, token }: { type: 'sourceToken' | 'destinationToken'; token: Token | null }) => {
  const tokenAddressState = type === 'sourceToken' ? sourceTokenAddressState : destinationTokenAddressState;
  const anotherTokenAddressState = type === 'sourceToken' ? destinationTokenAddressState : sourceTokenAddressState;
  const anotherTokenAddress = getRecoil(anotherTokenAddressState);

  if (token?.address === anotherTokenAddress) {
    exchangeTokenDirection();
    return;
  }

  setRecoil(tokenAddressState, token ? token.address : null);
};

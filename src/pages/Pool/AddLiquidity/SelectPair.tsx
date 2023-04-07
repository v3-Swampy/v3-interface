import React, { memo, useCallback } from 'react';
import { setRecoil } from 'recoil-nexus';
import { atom, useRecoilState, useRecoilValue } from 'recoil';
import { persistAtom } from '@utils/recoilUtils';
import cx from 'clsx';
import Button from '@components/Button';
import showTokenSelectModal from '@modules/TokenSelectModal';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { getRecoil } from 'recoil-nexus';

const transitions = {
  en: {
    select_pair: 'Select Pair',
    select_token: 'Select token',
  },
  zh: {
    select_pair: '选择币对',
    select_token: '选择代币',
  },
} as const;

const tokenAState = atom<Token | null>({
  key: `pool-tokenAState-${import.meta.env.MODE}`,
  default: null,
  effects: [persistAtom],
});

const tokenBState = atom<Token | null>({
  key: `pool-tokenBState-${import.meta.env.MODE}`,
  default: null,
  effects: [persistAtom],
});

export const swapTokenAB = () => {
  const tokenA = getRecoil(tokenAState);
  const tokenB = getRecoil(tokenBState);
  setRecoil(tokenAState, tokenB);
  setRecoil(tokenBState, tokenA);
  if (!tokenA || !tokenB) return false;
  return true;
};
export const useTokenA = () => useRecoilValue(tokenAState);
export const useTokenB = () => useRecoilValue(tokenBState);
export const useIsBothTokenSelected = () => {
  const tokenA = useRecoilValue(tokenAState);
  const tokenB = useRecoilValue(tokenBState);
  return !!tokenA && !!tokenB;
};

const SelectPair: React.FC<{ handleSwapToken: VoidFunction }> = ({ handleSwapToken }) => {
  const i18n = useI18n(transitions);

  const [tokenA, setTokenA] = useRecoilState(tokenAState);
  const [tokenB, setTokenB] = useRecoilState(tokenBState);

  const handleSetToken = useCallback(
    ({ token, type }: { token: Token; type: 'tokenA' | 'tokenB' }) => {
      const anotherToken = type === 'tokenA' ? tokenB : tokenA;
      const setToken = type === 'tokenA' ? setTokenA : setTokenB;
      if (anotherToken?.address === token.address) {
        handleSwapToken();
      } else {
        setToken(token);
      }
    },
    [tokenA, tokenB]
  );

  return (
    <>
      <p className="mt-16px mb-8px leading-18px text-14px text-black-normal font-medium">{i18n.select_pair}</p>
      <div className="mb-24px flex gap-10px">
        <Button
          className="!flex-shrink-1 w-50% h-40px rounded-100px !px-0"
          contentClassName={cx('w-full pr-16px', tokenA ? 'pl-8px' : 'pl-16px')}
          color={tokenA ? 'orange-light' : 'gradient'}
          onClick={() => showTokenSelectModal({ currentSelectToken: tokenA, onSelect: (token) => handleSetToken({ token, type: 'tokenA' }) })}
          type="button"
        >
          {tokenA && (
            <>
              <img src={tokenA.logoURI} alt={`${tokenA.symbol} icon`} className="w-24px h-24px rounded-100px mr-4px" />
              {tokenA.symbol}
            </>
          )}
          {!tokenA && i18n.select_token}
          <span className="i-ic:sharp-keyboard-arrow-down ml-auto flex-shrink-0 text-16px font-medium" />
        </Button>

        <Button
          className="!flex-shrink-1 w-50% h-40px rounded-100px !px-0"
          contentClassName={cx('w-full pr-16px', tokenB ? 'pl-8px' : 'pl-16px')}
          color={tokenB ? 'orange-light' : 'gradient'}
          onClick={() => showTokenSelectModal({ currentSelectToken: tokenB, onSelect: (token) => handleSetToken({ token, type: 'tokenB' }) })}
          type="button"
        >
          {tokenB && (
            <>
              <img src={tokenB.logoURI} alt={`${tokenB.symbol} icon`} className="w-24px h-24px rounded-100px mr-4px" />
              {tokenB.symbol}
            </>
          )}
          {!tokenB && i18n.select_token}
          <span className="i-ic:sharp-keyboard-arrow-down ml-auto flex-shrink-0 text-16px font-medium" />
        </Button>
      </div>
    </>
  );
};

export default memo(SelectPair);

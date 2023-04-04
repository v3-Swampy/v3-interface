import React from 'react';
import cx from 'clsx';
import Button from '@components/Button';
import showTokenSelectModal from '@modules/TokenSelectModal';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';

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

interface Props {
  tokenA: Token | null;
  tokenB: Token | null;
  setTokenA: (token: Token | null) => void;
  setTokenB: (token: Token | null) => void;
}

const SelectPair: React.FC<Props> = ({ tokenA, tokenB, setTokenA, setTokenB, }) => {
  const i18n = useI18n(transitions);

  return (
    <>
      <p className="mt-16px mb-8px leading-18px text-14px text-black-normal font-medium">{i18n.select_pair}</p>
      <div className="mb-24px flex gap-10px">
        <Button
          className="!flex-shrink-1 w-50% h-40px rounded-100px !px-0"
          contentClassName={cx('w-full pr-16px', tokenA ? 'pl-8px' : 'pl-16px')}
          color={tokenA ? 'orange-light' : 'gradient'}
          onClick={() => showTokenSelectModal({ currentSelectToken: tokenA, onSelect: setTokenA })}
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
          onClick={() => showTokenSelectModal({ currentSelectToken: tokenB, onSelect: setTokenB })}
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

export default SelectPair;

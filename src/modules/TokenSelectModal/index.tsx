import React, { useState, useMemo, useRef, useCallback, useTransition } from 'react';
import cx from 'clsx';
import { FixedSizeList } from 'react-window';
import CustomScrollbar from 'custom-react-scrollbar';
import { escapeRegExp } from 'lodash-es';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Input from '@components/Input';
import Balance from '@modules/Balance';
import useI18n from '@hooks/useI18n';
import { useAccount } from '@service/account';
import { useTokens, useCommonTokens, setCommonToken, type Token } from '@service/tokens';

import { isMobile } from '@utils/is';

const transitions = {
  en: {
    search_placeholder: 'Search name or paste address',
  },
  zh: {
    search_placeholder: '搜索名称或粘贴地址',
  },
} as const;

interface Props {
  currentSelectToken: Token | null;
  onSelect: (token: Token) => void;
}

const TokenListModalContent: React.FC<Props> = ({ currentSelectToken, onSelect }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  const [_, startTransition] = useTransition();
  const [filter, setFilter] = useState('');
  const handleFilterChange = useCallback<React.FormEventHandler<HTMLInputElement>>((evt) => {
    startTransition(() => {
      setFilter((evt.target as HTMLInputElement).value);
    });
  }, []);

  const tokens = useTokens();
  const filterTokens = useMemo(() => {
    if (!filter) return tokens;
    return tokens?.filter((token) => [token.name, token.symbol, token.address].some((str) => str?.search(new RegExp(escapeRegExp(filter), 'i')) !== -1));
  }, [filter, tokens]);

  const listRef = useRef<HTMLDivElement>();
  const handleScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(({ target }) => {
    listRef.current!.scrollTo(0, (target as unknown as HTMLDivElement).scrollTop);
  }, []);

  const Token = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const token = filterTokens[index];
      return (
        <div className="h-44px flex items-center bg-orange-light-hover">
          <div
            className={cx(
              'flex items-center !h-40px pl-8px pr-16px rounded-100px hover:bg-orange-light cursor-pointer transition-colors',
              currentSelectToken?.address === token.address && 'bg-orange-light pointer-events-none'
            )}
            style={style}
            onClick={() => {
              onSelect(token);
              hidePopup();
              setTimeout(() => setCommonToken(token), 88);
            }}
          >
            <img className="w-24px h-24px mr-8px" src={token.logoURI} alt={`${token.symbol} logo`} />

            <div className="mr-auto">
              <p className="leading-15px text-12px text-gray-normal font-medium">{token.name}</p>
              <p className="leading-18px text-14px text-black-normal font-medium">{token.symbol}</p>
            </div>

            {account && <Balance className="text-14px text-black-normal" address={token.address} decimals={token.decimals} />}
          </div>
        </div>
      );
    },
    [filterTokens]
  );

  return (
    <div className="mt-24px">
      <div className="flex items-center h-40px px-28px rounded-100px bg-orange-light-hover">
        <label className="inline-flex items-center pr-12px" htmlFor="input--token_search">
          <span className="i-ri:search-line flex-shrink-0 text-16px text-gray-normal font-medium" />
        </label>
        <Input id="input--token_search" className="text-14px h-40px" clearIcon placeholder={i18n.search_placeholder} onChange={handleFilterChange} />
      </div>

      <CommonTokens currentSelectToken={currentSelectToken} onSelect={onSelect} />

      <div className="my-16px h-2px bg-orange-light-hover" />

      <div className="flex flex-col gap-12px pb-4px rounded-20px bg-orange-light-hover">
        <CustomScrollbar className="max-h-294px px-16px pt-12px" onScroll={handleScroll}>
          <FixedSizeList width="100%" height={294} itemCount={filterTokens.length} itemSize={44} ref={listRef as any} style={{ overflow: undefined }}>
            {Token}
          </FixedSizeList>
        </CustomScrollbar>
      </div>
    </div>
  );
};

const CommonTokens: React.FC<Props> = ({ currentSelectToken, onSelect }) => {
  const commonTokens = useCommonTokens();

  return (
    <div className="mt-8px flex items-center gap-10px">
      {commonTokens?.map((token) => (
        <div
          key={token.address}
          className={cx(
            'inline-flex items-center p-8px pr-12px rounded-100px border-2px border-solid  border-orange-light text-14px text-black-normal font-medium cursor-pointer transition-colors',
            currentSelectToken?.address === token.address ? 'bg-orange-light-hover pointer-events-none' : 'bg-transparent hover:bg-orange-light-hover'
          )}
          onClick={() => {
            onSelect(token);
            hidePopup();
            setTimeout(() => setCommonToken(token), 88);
          }}
        >
          <img className="w-24px h-24px mr-6px" src={token.logoURI} alt={`${token.symbol} logo`} />
          {token.symbol}
        </div>
      ))}
    </div>
  );
};

const showTokenListModal = (props: Props) => {
  if (isMobile) {
    showDrawer({ Content: <TokenListModalContent {...props} />, title: '选择代币' });
  } else {
    showModal({ Content: <TokenListModalContent {...props} />, className: '!max-w-572px', title: '选择代币' }) as string;
  }
};

export default showTokenListModal;

import React, { useState, useMemo, useRef, useCallback, useTransition, useLayoutEffect } from 'react';
import cx from 'clsx';
import { FixedSizeList } from 'react-window';
import CustomScrollbar from 'custom-react-scrollbar';
import { escapeRegExp } from 'lodash-es';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Input from '@components/Input';
import Spin from '@components/Spin';
import Delay from '@components/Delay';
import Balance from '@modules/Balance';
import ConfirmPopper from '@modules/ConfirmPopper';
import useI18n from '@hooks/useI18n';
import { useAccount } from '@service/account';
import { validateHexAddress } from '@utils/addressUtils';
import { useTokens, useCommonTokens, setCommonToken, fetchTokenInfoByAddress, addTokenToList, deleteTokenFromList, isTokenEqual, type Token } from '@service/tokens';
import { isMobile } from '@utils/is';
import { ReactComponent as SearchIcon } from '@assets/icons/search.svg';
import { ReactComponent as DeleteIcon } from '@assets/icons/delete.svg';
import SelectTokenWarning from './SelectTokenWarning';
import './index.css';

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
  onSelect: (token: Token | null) => void;
}

const listHeight = isMobile ? Math.floor(globalThis.innerHeight - 280) : 264;

const TokenListModalContent: React.FC<Props> = ({ currentSelectToken, onSelect }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  const listRef = useRef<FixedSizeList>(null!);

  const tokens = useTokens();
  const [_, startTransition] = useTransition();
  const [searchTokens, setSearchTokens] = useState<Token[] | null>(null);
  const [inSearching, setInSearching] = useState(false);
  const searchUniqueId = useRef(0);
  const handleFilterChange = useCallback<React.FormEventHandler<HTMLInputElement>>(
    (evt) => {
      startTransition(() => {
        setInSearching(false);
        searchUniqueId.current += 1;
        const currentSearchId = searchUniqueId.current;
        const filterVal = (evt.target as HTMLInputElement).value.trim().toLocaleLowerCase();
        if (validateHexAddress(filterVal) && !tokens.some((token) => token.address.toLocaleLowerCase() === filterVal)) {
          setInSearching(true);
          fetchTokenInfoByAddress(filterVal)
            .then((searchedToken) => {
              if (!searchedToken || currentSearchId !== searchUniqueId.current) return;
              setSearchTokens([searchedToken]);
            })
            .finally(() => {
              if (currentSearchId !== searchUniqueId.current) return;
              setInSearching(false);
            });
        } else {
          if (!filterVal) {
            setSearchTokens(null);
          } else {
            setSearchTokens(
              tokens?.filter((token) =>
                [token.name, token.symbol, token.address].some(
                  (str) => str?.search(new RegExp(escapeRegExp(filterVal), 'i')) !== -1 || filterVal.search(new RegExp(escapeRegExp(str), 'i')) !== -1
                )
              )
            );
          }
        }
      });
    },
    [tokens]
  );

  const usedTokens = useMemo(() => (inSearching ? [] : searchTokens ?? tokens), [searchTokens, tokens, inSearching]);

  const [warningToken, setWarningToken] = useState<Token | null>(null);

  const Token = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const token = usedTokens[index];
      return (
        <div className="px-16px h-44px flex items-center bg-orange-light-hover" style={style}>
          <div
            className={cx(
              'list-token-item flex items-center w-full h-40px pl-8px pr-16px rounded-100px cursor-pointer transition-colors',
              currentSelectToken?.address === token.address && 'bg-orange-light pointer-events-none'
            )}
            onClick={() => {
              addTokenToList(token);
              if (token.fromSearch) {
                setWarningToken(token);
              } else {
                onSelect(token);
                hidePopup();
                setTimeout(() => setCommonToken(token), 88);
              }
            }}
          >
            <img className="w-24px h-24px mr-8px" src={token.logoURI} alt={`${token.symbol} logo`} />

            <div className="mr-auto">
              <p className="leading-15px text-12px text-gray-normal font-normal">{token.name}</p>
              <p className="leading-18px text-14px text-black-normal font-normal">{token.symbol === 'WCFX' ? 'CFX' : token.symbol}</p>
            </div>

            {token.fromSearch && (
              <ConfirmPopper
                title={`Sure to delete ${token.symbol}?`}
                className="mr-12px w-14px h-14px cursor-pointer pointer-events-auto"
                onConfirm={() => {
                  if (isTokenEqual(token, currentSelectToken)) {
                    onSelect(null);
                    hidePopup();
                  }
                  deleteTokenFromList(token);
                }}
              >
                <DeleteIcon className="w-full h-full hover:scale-120 transition-transform " />
              </ConfirmPopper>
            )}
            {account && <Balance className="text-14px text-black-normal" address={token.address} decimals={token.decimals} />}
          </div>
        </div>
      );
    },
    [usedTokens]
  );

  useLayoutEffect(() => {
    const currentSelectTokenIndex = tokens?.findIndex((token) => token.address === currentSelectToken?.address);
    if (typeof currentSelectTokenIndex === 'number' && currentSelectTokenIndex !== -1) {
      listRef.current?.scrollToItem(currentSelectTokenIndex, 'center');
    }
  }, []);

  return (
    <>
      <div id="token-select-modal-content" className={cx('mt-24px', warningToken && 'token-warning-blur-content')}>
        <div className="flex items-center h-40px px-28px rounded-100px bg-orange-light-hover">
          <label className="inline-flex items-center pr-12px" htmlFor="input--token_search">
            <SearchIcon className="flex-shrink-0 w-14px h-14px" />
          </label>
          <Input id="input--token_search" className="text-14px h-40px" clearIcon placeholder={i18n.search_placeholder} onChange={handleFilterChange} />
        </div>

        <CommonTokens currentSelectToken={currentSelectToken} onSelect={(token) => (token?.fromSearch ? setWarningToken(token) : onSelect(token))} />

        <div className="my-16px lt-mobile:mt-12px h-2px bg-orange-light-hover" />

        <div
          className={cx('relative flex flex-col gap-12px pt-12px pb-4px rounded-20px bg-orange-light-hover overflow-hidden', isMobile && 'drawer-inner-scroller touch-none')}
          style={{ minHeight: listHeight }}
        >
          {inSearching && (
            <Delay>
              <Spin className="!absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-48px" />
            </Delay>
          )}
          {!inSearching && searchTokens && searchTokens.length === 0 && (
            <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-14px text-black-light">No matching token found</p>
          )}
          <FixedSizeList ref={listRef} width="100%" height={listHeight} itemCount={usedTokens.length} itemSize={44} outerElementType={CustomScrollbar}>
            {Token}
          </FixedSizeList>
        </div>
      </div>
      {warningToken && (
        <SelectTokenWarning
          tokenSymbol={warningToken.symbol}
          tokenAddress={warningToken.address}
          onCancel={() => setWarningToken(null)}
          onConfirm={() => {
            onSelect(warningToken);
            hidePopup();
            setTimeout(() => setCommonToken(warningToken), 88);
          }}
        />
      )}
    </>
  );
};

const CommonTokens: React.FC<Props> = ({ currentSelectToken, onSelect }) => {
  const commonTokens = useCommonTokens();

  return (
    <div className="mt-8px flex items-center gap-10px lt-mobile:gap-6px">
      {commonTokens?.map((token) => (
        <div
          key={token.address}
          className={cx(
            'inline-flex items-center p-8px pr-12px lt-mobile:p-6px rounded-100px border-2px border-solid  border-orange-light text-14px lt-mobile:text-12px text-black-normal font-normal cursor-pointer transition-colors',
            currentSelectToken?.address === token.address ? 'bg-orange-light-hover pointer-events-none' : 'bg-transparent hover:bg-orange-light-hover'
          )}
          onClick={() => {
            onSelect(token);
            if (token.fromSearch) {
              return;
            }
            hidePopup();
            setTimeout(() => setCommonToken(token), 88);
          }}
        >
          <img className="mr-6px w-24px h-24px lt-mobile:w-20px lt-mobile:h-20px" src={token.logoURI} alt={`${token.symbol} logo`} />
          {token.symbol === 'WCFX' ? 'CFX' : token.symbol}
        </div>
      ))}
    </div>
  );
};

const showTokenListModal = (props: Props) => {
  if (isMobile) {
    showDrawer({ Content: <TokenListModalContent {...props} />, height: 'full', title: 'Select a token' });
  } else {
    showModal({ Content: <TokenListModalContent {...props} />, className: '!max-w-572px', title: 'Select a token' }) as string;
  }
};

export default showTokenListModal;

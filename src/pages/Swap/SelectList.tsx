import React, { useRef, useCallback, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import CustomScrollbar from 'custom-react-scrollbar';
import { showModal, showDrawer } from '@components/showPopup';
import Balance from '@modules/Balance';
import { useTokens } from '@service/tokens';
import useI18n from '@hooks/useI18n';
import { isMobile } from '@utils/is';

const transitions = {
  en: {
    search_placeholder: 'Search name or paste address',
  },
  zh: {
    search_placeholder: '搜索名称或粘贴地址',
  },
} as const;

const TokenSelectModalContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const tokens = useTokens();

  const listRef = useRef<HTMLDivElement>();
  const handleScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(({ target }) => {
    listRef.current!.scrollTo(0, (target as unknown as HTMLDivElement).scrollTop);
  }, []);

  const Token = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const token = tokens[index];
      return (
        <div className="flex items-center h-56px px-24px hover:bg-gray-100 cursor-pointer transition-colors" style={style}>
          <div className="mr-auto">
            <p className="text-14px font-medium">{token.name}</p>
            <p className="mt-4px text-12px">{token.symbol}</p>
          </div>

          <Balance address={token.address} />
        </div>
      );
    },
    [tokens]
  );

  return (
    <div className="">
      <div className="flex items-center h-40px mx-24px px-12px rounded-12px border-1px border-solid border-#d2d9ee bg-#F5F6Fc">
        <span className="i-ri:search-line mr-6px flex-shrink-0" />
        <input className="w-full h-full flex-shrink-0" placeholder={i18n.search_placeholder} />
      </div>

      <div className="mt-20px max-h-600px flex flex-col gap-12px">
        <CustomScrollbar className="max-h-336px" onScroll={handleScroll}>
          <FixedSizeList width="100%" height={336} itemCount={tokens.length} itemSize={56} ref={listRef as any} style={{ overflow: undefined }}>
            {Token}
          </FixedSizeList>
        </CustomScrollbar>
      </div>
    </div>
  );
};

const showSelectListModal = () => {
  if (isMobile) {
    showDrawer({ Content: <TokenSelectModalContent />, title: '选择代币' });
  } else {
    showModal({ Content: <TokenSelectModalContent />, className: '!max-w-370px', title: '选择代币' }) as string;
  }
};

export default showSelectListModal;

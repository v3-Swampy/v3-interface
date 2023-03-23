import React from 'react';
import { showModal, showDrawer } from '@components/showPopup';
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

  return (
    <div className="">
      <div className="flex items-center h-40px px-12px rounded-12px border-1px border-solid border-#d2d9ee bg-#F5F6Fc">
        <span className="i-ri:search-line mr-6px flex-shrink-0" />
        <input className="w-full h-full flex-shrink-0" placeholder={i18n.search_placeholder} />
      </div>

      <div className="mt-20px max-h-600px flex flex-col gap-12px">
        {tokens.map((token) => (
          <div className='h-56px'>
            {token.name}
          </div>
        ))}
      </div>
    </div>
  );
};

const showTokenSelectModal = () => {
  if (isMobile) {
    showDrawer({ Content: <TokenSelectModalContent />, title: '选择代币' });
  } else {
    showModal({ Content: <TokenSelectModalContent />, className: '!max-w-370px', title: '选择代币' }) as string;
  }
};

export default showTokenSelectModal;

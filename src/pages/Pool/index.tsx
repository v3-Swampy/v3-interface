import React from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    pool: 'Pool',
  },
  zh: {
    pool: '池子',
  },
} as const;

const PoolPage: React.FC = () => {
  const i18n = useI18n(transitions);
  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.pool}</span>
        </div>
      </BorderBox>
    </PageWrapper>
  );
};

export default PoolPage;

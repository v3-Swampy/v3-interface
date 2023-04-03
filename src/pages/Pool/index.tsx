import React from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    pools: 'Pools',
    new_position: 'New Position',
  },
  zh: {
    pools: '池子',
    new_position: '新仓位',
  },
} as const;

const PoolPage: React.FC = () => {
  const i18n = useI18n(transitions);
  return (
    <PageWrapper className="pt-56px">
      <div className="flex justify-between mb-16px px-88px h-40px">
        <span className="mt-10px h-30px leading-30px text-24px text-orange-normal">{i18n.pools}</span>
        <Button className="h-40px text-18px px-24px rounded-100px" color="gradient">+ {i18n.new_position}</Button>
      </div>
      <BorderBox className="relative mx-auto max-w-800px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.pools}</span>
        </div>
      </BorderBox>
    </PageWrapper>
  );
};

export default PoolPage;

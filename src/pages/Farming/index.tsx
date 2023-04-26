import React, { useCallback } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { Suspense } from 'react';
import Spin from '@components/Spin';
import { useLocation, useNavigate } from 'react-router-dom';

import AllFarms from './AllFarms';
import MyFarms from './MyFarms';

const transitions = {
  en: {
    farming: 'Farming',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    allFarms: 'All Farms',
    myFarms: 'My Farms',
  },
  zh: {
    farming: '挖矿',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    allFarms: 'All Farms',
    myFarms: 'My Farms',
  },
} as const;

enum TabKey {
  All = 'all-farms',
  My = 'my-farms',
}
type TabKeyType = TabKey.All | TabKey.My;

const FarmingPage: React.FC = () => {
  const navigate = useNavigate();
  const { search, pathname } = useLocation();
  const i18n = useI18n(transitions);
  const params = new URLSearchParams(search);
  const tab = params.get('tab') as TabKeyType;
  const buttonClass = 'inline-block py-10px leading-18px px-6 rounded-full text-center text-sm font-medium border border-solid text-gray box-border cursor-pointer';
  const buttonClassActive = 'bg-orange-light !text-black-normal border border-solid border-orange-light';

  const handleClickTab = useCallback((tab: TabKeyType) => {
    const search = new URLSearchParams(params);
    search.set('tab', tab);

    navigate(`${pathname}?${search.toString()}`);
  }, []);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex justify-start items-end pl-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          {i18n.farming}
          <div className="font-500 text-14px leading-18px ml-2 color-#C2C4D0">{i18n.desc}</div>
        </div>
        <BorderBox className="relative w-full p-16px rounded-28px" variant="gradient-white">
          <div>
            <div className={`${buttonClass} mr-2 ${tab === TabKey.My ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.My)}>
              {i18n.myFarms}
            </div>
            <div className={`${buttonClass} ${tab === TabKey.All ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.All)}>
              {i18n.allFarms}
            </div>
          </div>
          <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>{tab === TabKey.My ? <MyFarms /> : <AllFarms />}</Suspense>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default FarmingPage;

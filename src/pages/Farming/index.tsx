import React, { useCallback } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import useI18n from '@hooks/useI18n';
import { Suspense } from 'react';
import Spin from '@components/Spin';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCanClaim } from '@service/farming';
import AllFarms from './AllFarms';
import MyFarms from './MyFarms';
import CountDown from './CountDown';

import EndIn from './EndIn';

const transitions = {
  en: {
    farming: 'Farming',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    allFarms: 'All Farms',
    myFarms: 'My Farms',
    claimOpeningAt: 'Claim will opening at',
    tooltipClaim: 'Claim rewards starting: 05/30/2023 8:00 Unstaking LP before the claim time will result in losing all earned rewards.',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
  },
  zh: {
    farming: '挖矿',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    allFarms: 'All Farms',
    myFarms: 'My Farms',
    claimOpeningAt: 'Claim will opening at',
    tooltipClaim: 'Claim rewards starting: 05/30/2023 8:00 Unstaking LP before the claim time will result in losing all earned rewards.',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
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
  const buttonClass = 'inline-block py-10px leading-18px px-6 rounded-full text-center text-sm font-medium border border-solid text-gray-normal box-border cursor-pointer';
  const buttonClassActive = 'bg-orange-light !text-orange-normal border border-solid border-orange-light';
  const isCanClaim = useCanClaim();

  const handleClickTab = useCallback((tab: TabKeyType) => {
    const search = new URLSearchParams(params);
    search.set('tab', tab);

    navigate(`${pathname}?${search.toString()}`);
  }, []);

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px">
      <div className="mx-auto max-w-800px">
        <div className="flex justify-start items-end pl-16px mb-16px lt-mobile:pl-0 lt-mobile:flex-col lt-mobile:items-start">
          <div className="leading-30px text-24px text-orange-normal font-medium lt-mobile:text-18px lt-mobile:leading-23px">{i18n.farming}</div>
          <div className="font-500 text-14px leading-18px ml-2 color-gray-normal lt-mobile:text-12px lt-mobile:leading-15px lt-mobile:ml-0 lt-mobile:mt-6.5px lt-mobile:w-246px">
            {i18n.desc}
          </div>
        </div>
        <EndIn>
          <div className="flex justify-between lt-mobile:flex-col">
            <div>
              <div className={`${buttonClass} mr-2 ${tab === TabKey.My ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.My)}>
                {i18n.myFarms}
              </div>
              <div className={`${buttonClass} ${tab !== TabKey.My ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.All)}>
                {i18n.allFarms}
              </div>
            </div>
            <div>{!isCanClaim && <CountDown />}</div>
          </div>
          <Suspense fallback={<Spin className="!block mx-auto text-60px mt-4" />}>{tab === TabKey.My ? <MyFarms /> : <AllFarms />}</Suspense>
        </EndIn>
      </div>
    </PageWrapper>
  );
};

export default FarmingPage;

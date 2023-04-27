import React, { useCallback } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { Suspense } from 'react';
import Spin from '@components/Spin';
import { useLocation, useNavigate } from 'react-router-dom';
import Tooltip from '@components/Tooltip';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';

import AllFarms from './AllFarms';
import MyFarms from './MyFarms';

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
  const buttonClass = 'inline-block py-10px leading-18px px-6 rounded-full text-center text-sm font-medium border border-solid text-gray box-border cursor-pointer';
  const buttonClassActive = 'bg-orange-light !text-black-normal border border-solid border-orange-light';

  const handleClickTab = useCallback((tab: TabKeyType) => {
    const search = new URLSearchParams(params);
    search.set('tab', tab);

    navigate(`${pathname}?${search.toString()}`);
  }, []);

  const classNames = {
    colon: '-mt-0.5',
  };

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex justify-start items-end pl-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          {i18n.farming}
          <div className="font-500 text-14px leading-18px ml-2 color-#C2C4D0">{i18n.desc}</div>
        </div>
        <BorderBox className="relative w-full p-16px rounded-28px" variant="gradient-white">
          <div className="flex justify-between">
            <div>
              <div className={`${buttonClass} mr-2 ${tab === TabKey.My ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.My)}>
                {i18n.myFarms}
              </div>
              <div className={`${buttonClass} ${tab !== TabKey.My ? buttonClassActive : ''}`} onClick={() => handleClickTab(TabKey.All)}>
                {i18n.allFarms}
              </div>
            </div>
            <div className="w-51 h-16 bg-orange-normal rounded-4">
              <div className="h-6 font-400 text-12px leading-15px color-white-normal flex items-center justify-center">
                {i18n.claimOpeningAt}
                <Tooltip text={i18n.tooltipClaim}>
                  <span className="w-12px h-12px ml-6px">
                    <InfoIcon className="w-12px h-12px color-white-normal" />
                  </span>
                </Tooltip>
              </div>
              <div className="bg-white-normal h-10 color-black-normal">
                <div className="flex justify-around items-center font-700 text-16px leading-20px">
                  <span>00</span>
                  <span className={classNames.colon}>&#58;</span>
                  <span>00</span>
                  <span className={classNames.colon}>&#58;</span>
                  <span>00</span>
                  <span className={classNames.colon}>&#58;</span>
                  <span>00</span>
                </div>
                <div className="font-400 text-10px leading-13px flex justify-around items-center">
                  <span className="text-10px">{i18n.days}</span>
                  <span>{i18n.hours}</span>
                  <span>{i18n.minutes}</span>
                  <span>{i18n.seconds}</span>
                </div>
              </div>
            </div>
          </div>
          <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>{tab === TabKey.My ? <MyFarms /> : <AllFarms />}</Suspense>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default FarmingPage;

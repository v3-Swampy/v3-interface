import React, { useState } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { Suspense } from 'react';
import Spin from '@components/Spin';

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

const FarmingPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const buttonClass = 'inline-block py-10px leading-18px px-6 rounded-full text-center text-sm font-medium border border-solid text-gray box-border cursor-pointer';
  const buttonClassActive = 'bg-orange-light !text-black-normal border border-solid border-orange-light';

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex justify-start items-end pl-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          {i18n.farming}
          <div className="font-500 text-14px leading-18px ml-2 color-#C2C4D0">{i18n.desc}</div>
        </div>
        <BorderBox className="relative w-full p-16px rounded-28px" variant="gradient-white">
          <div>
            <div className={`${buttonClass} mr-2 ${activeTab === 'my' ? buttonClassActive : ''}`} onClick={() => setActiveTab('my')}>
              {i18n.myFarms}
            </div>
            <div className={`${buttonClass} ${activeTab === 'all' ? buttonClassActive : ''}`} onClick={() => setActiveTab('all')}>
              {i18n.allFarms}
            </div>
          </div>
          <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
            {activeTab === 'all' && <AllFarms />}
            {activeTab === 'my' && <MyFarms />}
          </Suspense>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default FarmingPage;

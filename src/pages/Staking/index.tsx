import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import useI18n, { compiled } from '@hooks/useI18n';
import DataDetail from './DataDetail';

const transitions = {
  en: {
    staking: 'Staking',
    stake_tip: 'Stake your {token} to boost your LP farming rewards and increase your Launchpad score.',
    stake_button: 'Stake {token} to boost your farming!',
  },
  zh: {
    staking: '质押',
    stake_tip: '质押你的 {token} 来提高你的LP耕作奖励，并增加你的Launchpad分数。',
    stake_button: 'Stake {token} to boost your farming!',
  },
} as const;

const StakingPage: React.FC = () => {
  const i18n = useI18n(transitions);
  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.staking}</span>
        </div>

        <DataDetail />

        <BorderBox variant="gradient-orange-light-hover" className="mt-16px flex p-16px rounded-20px">
          <div className="w-1/2">
            <p className="leading-20px text-12px text-black-normal">{compiled(i18n.stake_tip, { token: 'VST' })}</p>
            <Button color="gradient" fullWidth className="mt-26px h-36px rounded-10px text-14px">
              {compiled(i18n.stake_button, { token: 'VST' })}
            </Button>
          </div>

          <div className="w-1/2 flex flex-col justify-center items-end">
            <img src="" alt="Stake VST, harvest more." />

            <Link to="/stake/simulator" className="block mt-16px text-12px text-black-normal">
              Simulate your staking strategy →
            </Link>
          </div>
        </BorderBox>
      </BorderBox>
    </PageWrapper>
  );
};

export default StakingPage;

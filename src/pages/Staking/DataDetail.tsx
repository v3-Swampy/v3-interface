import React, { Suspense } from 'react';
import BorderBox from '@components/Box/BorderBox';
import Spin from '@components/Spin';
import useI18n, { compiled } from '@hooks/useI18n';
import { useTotalStakeVST, useVSTPrice, usePercentageOfCulatingtion, useAverageStakeDuration } from '@service/staking';
import { TokenVST } from '@service/tokens';

const transitions = {
  en: {
    total_staking: 'Total Staked {token}',
    percentage_of_culatingtion: '{percentage}% of all circulating {token}',
    average_stake_duration: 'Average Stake Duration: {months} months',
  },
  zh: {
    total_staking: '总共质押的 {token}',
    percentage_of_culatingtion: '占 {token} 总流通量的 {percentage}%',
    average_stake_duration: '平均质押时长: {months} 个月',
  },
} as const;

const DataDetailContent: React.FC = () => {
  const i18n = useI18n(transitions);

  const totalStakeVST = useTotalStakeVST();
  const VSTPrice = useVSTPrice();
  const percentageOfCulatingtion = usePercentageOfCulatingtion();
  const averageStakeDuration = useAverageStakeDuration();

  const totalPrice = totalStakeVST && VSTPrice ? totalStakeVST.mul(VSTPrice) : null;

  return (
    <>
      <div className="w-1/2">
        <p className="leading-23px text-14px text-gray-normal">{compiled(i18n.total_staking, { token: 'VST' })}</p>
        <p className="leading-23px text-16px text-black-normal font-medium">{totalStakeVST?.toDecimalStandardUnit(2, TokenVST?.decimals) ?? '...'}</p>
        <p className="leading-23px text-14px text-black-normal">~ ${totalPrice?.toDecimalStandardUnit(2, TokenVST?.decimals) ?? '...'}</p>
      </div>

      <div className="w-1/2 flex flex-col justify-center">
        <p className="leading-21px text-14px text-black-normal font-medium">{compiled(i18n.percentage_of_culatingtion, { token: 'VST', percentage: percentageOfCulatingtion })}</p>
        <p className="leading-21px text-14px text-black-normal font-medium">{compiled(i18n.average_stake_duration, { months: averageStakeDuration })}</p>
      </div>
    </>
  );
};

const DataDetail: React.FC = () => {
  return (
    <BorderBox variant="orange" className="relative flex p-16px h-105px rounded-20px bg-white-normal">
      <Suspense fallback={<Spin className='!absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-60px'/>}>
        <DataDetailContent />
      </Suspense>
    </BorderBox>
  );
};

export default DataDetail;

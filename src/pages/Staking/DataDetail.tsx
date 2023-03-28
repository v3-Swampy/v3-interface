import React from 'react';
import BorderBox from '@components/Box/BorderBox';
import useI18n, { compiled } from '@hooks/useI18n';

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

const DataDetail: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <BorderBox variant="orange" className="flex p-16px rounded-20px bg-white-normal">
      <div className="w-1/2">
        <p className="leading-23px text-14px text-gray-normal">{compiled(i18n.total_staking, { token: 'VST' })}</p>
        <p className="leading-23px text-16px text-black-normal font-medium">12321321324</p>
        <p className="leading-23px text-14px text-black-normal">~ $1233123</p>
      </div>

      <div className="w-1/2 flex flex-col justify-center">
        <p className="leading-21px text-14px text-black-normal font-medium">{compiled(i18n.total_staking, { token: 'VST', percentage: '24.21' })}</p>
        <p className="leading-21px text-14px text-black-normal font-medium">{compiled(i18n.average_stake_duration, { months: '7.59' })}</p>
      </div>
    </BorderBox>
  );
};

export default DataDetail;

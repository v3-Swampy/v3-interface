import React, { Suspense, useMemo } from 'react';
import BorderBox from '@components/Box/BorderBox';
import Spin from '@components/Spin';
import useI18n, { compiled } from '@hooks/useI18n';
import { useTotalStakeVST, useStakePercent, useAverageStakeDuration } from '@service/staking';
import { TokenVST, TokenCFX, TokenUSDT } from '@service/tokens';
import { trimDecimalZeros } from '@utils/numberUtils';
// import { useVSTPrice } from '@hooks/usePairPrice';
import { useTokenPrice } from '@service/pairs&pool';
import { numberWithCommas } from '@utils/numberUtils';

const transitions = {
  en: {
    total_staking: 'Total Staked {token}',
    percentage_of_culatingtion: '<b>{percentage}%</b> of all circulating {token}',
    average_stake_duration: 'Average Stake Duration: <b>{duration}</b>',
  },
  zh: {
    total_staking: '总共质押的 {token}',
    percentage_of_culatingtion: '占 {token} 总流通量的 <b>{percentage}%</b>',
    average_stake_duration: '平均质押时长: <b>{duration}></b>',
  },
} as const;

const DataDetailContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const totalStakeVST = useTotalStakeVST();
  const VSTPrice = useTokenPrice(TokenVST.address);
  const percentageOfCulatingtion = useStakePercent();
  const averageStakeDuration = useAverageStakeDuration();

  const totalLockedBalanceUSD = useMemo(() => {
    return VSTPrice && totalStakeVST ? numberWithCommas(totalStakeVST.mul(VSTPrice).toDecimalStandardUnit(3, TokenUSDT.decimals)) : '-';
    // return VSTPrice && totalStakeVST ? numberWithCommas(parseFloat((+VSTPrice * +totalStakeVST?.toDecimalStandardUnit(3, TokenVST?.decimals)).toString().slice(0, -1))) : '';
  }, [VSTPrice, totalStakeVST?.toDecimalMinUnit()]);

  return (
    <div className="flex flex-col p-16px pb-24px leading-18px text-14px text-black-normal justify-between">
      <div className="flex flex-col">
        <p>{compiled(i18n.total_staking, { token: TokenVST?.symbol })}</p>
        <p className="leading-40px text-32px font-medium mt-24px mb-8px">{totalStakeVST?.toDecimalStandardUnit(2, TokenVST?.decimals) ?? '...'}</p>
        <p className="font-medium">~ {totalLockedBalanceUSD ? `$${totalLockedBalanceUSD}` : '-'}</p>
      </div>
      <div className="flex flex-col leading-18px text-14px text-black-normal">
        <p
          className="font-medium"
          dangerouslySetInnerHTML={{ __html: compiled(i18n.percentage_of_culatingtion, { token: TokenVST?.symbol, percentage: percentageOfCulatingtion }) }}
        />
        <p
          className="leading-21px text-14px text-black-normal font-medium"
          dangerouslySetInnerHTML={{ __html: compiled(i18n.average_stake_duration, { duration: averageStakeDuration }) }}
        />
      </div>
    </div>
  );
};

const DataDetail: React.FC = () => {
  return (
    <div className="max-w-310px flex rounded-16px bg-white-normal border-2px border-solid border-orange-light-hover">
      <Suspense fallback={<Spin className="!absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-60px" />}>
        <DataDetailContent />
      </Suspense>
    </div>
  );
};

export default DataDetail;

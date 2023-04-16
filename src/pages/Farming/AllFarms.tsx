import React from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import ToolTip from '@components/Tooltip';
import Corner from './Corner';
import showStakeLPModal from './StakeLPModal';
import { usePoolList, type PoolType } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    allocPoint: 'Multipier',
    stakeLP: 'Stake LP',
    tooltipMultipier: 'The allocPoint is the number of times your rewards will be multiplied.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    allocPoint: 'Multipier',
    stakeLP: 'Stake LP',
    tooltipMultipier: 'The allocPoint is the number of times your rewards will be multiplied.',
  },
} as const;

const AllFarmsItem: React.FC<{ data: PoolType }> = ({ data }) => {
  const i18n = useI18n(transitions);

  const className = {
    title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
    content: 'color-black-normal text-14px font-500 not-italic leading-18px',
  };

  return (
    <div className="bg-orange-light-hover rounded-2xl mb-6 last:mb-0 flex justify-between py-4 px-8 relative">
      <Corner timestatmp={Number(data.currentIncentivePeriod.endTime)}></Corner>
      <div>
        <div className={`${className.title}`}>{i18n.poolName}</div>
        <div className={`${className.content} inline-flex justify-center items-center`}>
          <TokenPair
            position={{
              leftToken: data.token0,
              rightToken: data.token1,
              fee: data.fee,
            } as any}
          />
        </div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.APR} {i18n.range}
        </div>
        <div className={`${className.content}`}>
          {data.range[0]}% ~ {data.range[1]}%
        </div>
      </div>
      <div>
        <div className={`${className.title}`}>{i18n.tvl}</div>
        <div className={`${className.content}`}>${numFormat(data.tvl)}</div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.allocPoint}
          <ToolTip text={i18n.tooltipMultipier}>
            <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
          </ToolTip>
        </div>
        <div className="text-12px font-500 not-italic leading-15px color-green-normal flex items-center">
          <LightningIcon className="w-5 h-5 mr-0.5" />
          {data.allocPoint}X
        </div>
      </div>
      <div className="flex items-center">
        <div
          className="flex items-center justify-center px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer"
          onClick={() => showStakeLPModal(data)}
        >
          {i18n.stakeLP}
        </div>
      </div>
    </div>
  );
};

const AllFarms = () => {
  const { loading, poolList } = usePoolList();

  return (
    <div className="mt-6">
      {poolList.map((p) => (
        <AllFarmsItem key={p.address} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

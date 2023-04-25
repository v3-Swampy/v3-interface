import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import Tooltip from '@components/Tooltip';
import Corner from './Corner';
import showStakeLPModal from './StakeLPModal';
import { type PoolType, usePoolsQuery } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';

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

  const className = useMemo(
    () => ({
      title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
      content: 'color-black-normal text-14px font-500 not-italic leading-18px',
      authConnectButton: 'flex items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer',
    }),
    []
  );

  return (
    <div className="bg-orange-light-hover rounded-2xl mb-6 last:mb-0 flex justify-between py-4 px-8 relative">
      <Corner timestamp={Number(data.currentIncentivePeriod.endTime)}></Corner>
      <div>
        <div className={`${className.title}`}>{i18n.poolName}</div>
        <div className={`${className.content} inline-flex justify-center items-center`}>
          <TokenPair
            position={
              {
                leftToken: data.leftToken,
                rightToken: data.rightToken,
                fee: data.fee,
              } as any
            }
          />
        </div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.APR} {i18n.range}
        </div>
        {/* TODO hardcode temporary */}
        {/* <div className={`${className.content}`}>{data.range.length ? `${data.range[0]}% ~ ${data.range[1]}%` : '--'}</div> */}
        <div className={`${className.content}`}>{`Infinity% ~ Infinity%`}</div>
      </div>
      <div>
        <div className={`${className.title}`}>{i18n.tvl}</div>
        <div className={`${className.content}`}>{data.tvl ? `$${numFormat(data.tvl)}` : '--'}</div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.allocPoint}
          <Tooltip text={i18n.tooltipMultipier}>
            <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
          </Tooltip>
        </div>
        <div className="text-12px font-500 not-italic leading-15px color-black-normal flex items-center">{data.allocPoint}X</div>
      </div>
      <div className="flex items-center">
        <AuthConnectButton className={className.authConnectButton}>
          <div className={className.authConnectButton} onClick={() => showStakeLPModal(data)}>
            {i18n.stakeLP}
          </div>
        </AuthConnectButton>
      </div>
    </div>
  );
};

const AllFarms = () => {
  const poolList = usePoolsQuery();

  return (
    <div className="mt-6">
      {poolList.map((p: any) => (
        <AllFarmsItem key={p.address} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

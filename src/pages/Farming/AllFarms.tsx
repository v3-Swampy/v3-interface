import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import Tooltip from '@components/Tooltip';
import showStakeLPModal from './StakeLPModal';
import { type PoolType, usePoolsQuery } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';
import classNames from './classNames';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    allocPoint: 'Multiplier',
    stakeLP: 'Stake LP',
    tooltipMultiplier: 'The allocPoint is the number of times your rewards will be multiplied.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    allocPoint: 'Multiplier',
    stakeLP: 'Stake LP',
    tooltipMultiplier: 'The allocPoint is the number of times your rewards will be multiplied.',
  },
} as const;

const AllFarmsItem: React.FC<{ data: PoolType }> = ({ data }) => {
  const i18n = useI18n(transitions);

  return (
    <div
      className={`bg-orange-light-hover rounded-2xl mb-6 last:mb-0 py-4 px-8 relative grid grid-cols-17 lt-mobile:px-2 lt-mobile:border-orange-light lt-mobile:border-solid lt-mobile:border-1px ${classNames.poolWrapper}`}
    >
      <div className="col-span-5 lt-mobile:col-span-17 lt-mobile:mb-18px">
        <div className={`${classNames.title}`}>{i18n.poolName}</div>
        <div className={`${classNames.content} inline-flex justify-center items-center`}>
          <TokenPair
            position={
              {
                leftToken: data.leftToken,
                rightToken: data.rightToken,
                fee: data.fee,
              } as any
            }
            symbolClassName={classNames.symbol}
            feeClassName={classNames.fee}
          />
        </div>
      </div>
      <div className="col-span-4 lt-mobile:col-span-7">
        <div className={`${classNames.title}`}>
          {i18n.APR} {i18n.range}
        </div>
        {/* TODO hardcode temporary */}
        {/* <div className={`${classNames.content}`}>{data.range.length ? `${data.range[0]}% ~ ${data.range[1]}%` : '--'}</div> */}
        <div className={`${classNames.content}`}>{`Infinity% ~ Infinity%`}</div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.tvl}</div>
        <div className={`${classNames.content}`}>{data.tvl ? `$${numFormat(data.tvl)}` : '--'}</div>
      </div>
      <div className={`col-span-2 lt-mobile:col-span-4 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>
          {i18n.allocPoint}
          <Tooltip text={i18n.tooltipMultiplier}>
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px" />
            </span>
          </Tooltip>
        </div>
        <div className={classNames.content}>{data.allocPoint}X</div>
      </div>
      <div className="flex items-center justify-end col-span-3 lt-mobile:absolute lt-mobile:right-2 lt-mobile:top-4">
        <AuthConnectButton className={classNames.authConnectButton}>
          <div className={classNames.authConnectButton} onClick={() => showStakeLPModal(data)}>
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
    <div className="mt-6 lt-mobile:mt-4">
      {poolList.map((p: any) => (
        <AllFarmsItem key={p.address} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

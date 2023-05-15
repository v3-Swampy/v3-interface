import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import Tooltip from '@components/Tooltip';
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
      title: 'flex items-center color-gray-normal text-xs font-400 not-italic leading-15px mb-2 lt-mobile:mb-1',
      content: 'color-black-normal text-14px font-500 not-italic leading-18px lt-mobile:text-12px lt-mobile:leading-15px',
      authConnectButton:
        'flex items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer lt-mobile:border-1 lt-mobile:text-14px',
      splitLine: `lt-mobile:before:content-[''] lt-mobile:before:border-0 lt-mobile:before:border-l-1px lt-mobile:before:border-solid lt-mobile:before:absolute lt-mobile:before:top-2px lt-mobile:before:bottom-2px lt-mobile:relative lt-mobile:before:-left-2 lt-mobile:before:border-color-orange-light`,
    }),
    []
  );

  return (
    <div className="bg-orange-light-hover rounded-2xl mb-6 last:mb-0 py-4 px-8 relative grid grid-cols-17 lt-mobile:mb-4 lt-mobile:rounded-14px lt-mobile:border-solid lt-mobile:border-orange-light lt-mobile:border-1px lt-mobile:px-2">
      <div className="col-span-5 lt-mobile:col-span-17 lt-mobile:mb-18px">
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
            symbolClassName="lt-mobile:font-500 lt-mobile:text-14px lt-mobile:leading-18px"
            feeClassName="lt-mobile:h-18px lt-mobile:text-12px lt-mobile:leading-18px"
          />
        </div>
      </div>
      <div className="col-span-4 lt-mobile:col-span-7">
        <div className={`${className.title}`}>
          {i18n.APR} {i18n.range}
        </div>
        {/* TODO hardcode temporary */}
        {/* <div className={`${className.content}`}>{data.range.length ? `${data.range[0]}% ~ ${data.range[1]}%` : '--'}</div> */}
        <div className={`${className.content}`}>{`Infinity% ~ Infinity%`}</div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${className.splitLine}`}>
        <div className={`${className.title}`}>{i18n.tvl}</div>
        <div className={`${className.content}`}>{data.tvl ? `$${numFormat(data.tvl)}` : '--'}</div>
      </div>
      <div className={`col-span-2 lt-mobile:col-span-4 ${className.splitLine}`}>
        <div className={`${className.title}`}>
          {i18n.allocPoint}
          <Tooltip text={i18n.tooltipMultipier}>
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px" />
            </span>
          </Tooltip>
        </div>
        <div className="text-12px font-500 not-italic leading-15px color-black-normal pl-3 lt-mobile:pl-0">{data.allocPoint}X</div>
      </div>
      <div className="flex items-center justify-end col-span-3 lt-mobile:absolute lt-mobile:right-2 lt-mobile:top-4">
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
    <div className="mt-6 lt-mobile:mt-4">
      {poolList.map((p: any) => (
        <AllFarmsItem key={p.address} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

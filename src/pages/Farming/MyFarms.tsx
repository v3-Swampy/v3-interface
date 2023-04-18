import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import ToolTip from '@components/Tooltip';
import Positions from './Positions';
import dayjs from 'dayjs';
import Corner from './Corner';
import { useMyFarmingList } from '@service/farming/myFarms';
import TokenPair from '@modules/Position/TokenPair';
import { PoolType } from '@service/farming';
import { usePool } from '@service/pairs&pool';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Claimable',
    tooltipClaimable: 'The claimable is the amount of rewards you can claim.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Claimable',
    tooltipClaimable: 'The claimable is the amount of rewards you can claim.',
  },
} as const;

const MyFarmsItem: React.FC<{
  data: PoolType & {
    APR: string;
    multipier: string;
    staked: string;
    claimable: string;
  };
}> = ({ data }) => {
  const i18n = useI18n(transitions);

  usePool({
    tokenA: data.token0,
    tokenB: data.token1,
    fee: data.fee,
  });

  const [isShow, setIsShow] = React.useState<boolean>(false);
  const className = {
    title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
    content: 'color-black-normal text-14px font-500 not-italic leading-18px color-black-normal',
  };

  const handleShow = () => {
    setIsShow(!isShow);
  };

  const isEnded = dayjs().isAfter(dayjs.unix(Number(data.currentIncentivePeriod.endTime)));

  return (
    <div className={`rounded-2xl mb-6 last:mb-0 py-4 px-4 relative ${isEnded ? 'bg-gray-light/30' : 'bg-orange-light-hover'}`}>
      <Corner timestatmp={Number(data.currentIncentivePeriod.endTime)}></Corner>
      <div className="flex justify-between relative px-4">
        <div className="ml-20px">
          <div className={`${className.title}`}>{i18n.poolName}</div>
          <div className={`${className.content} inline-flex justify-center items-center`}>
            <TokenPair
              position={
                {
                  leftToken: data.token0,
                  rightToken: data.token1,
                  fee: data.fee,
                } as any
              }
            />
          </div>
        </div>
        <div>
          <div className={`${className.title}`}>{i18n.APR}</div>
          <div className={`${className.content} flex items-center`}>
            {data.APR}% <LightningIcon className="w-5 h-5 mx-0.5 ml-2" />
            {data.multipier}X
          </div>
        </div>
        <div>
          <div className={`${className.title}`}>{i18n.stake}</div>
          <div className={`${className.content}`}>$ {numFormat(data.staked)}</div>
        </div>
        <div>
          <div className={`${className.title}`}>
            {i18n.claimable}
            <ToolTip text={i18n.tooltipClaimable}>
              <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
            </ToolTip>
          </div>
          <div className="text-14px font-500 not-italic leading-15px flex items-center color-black-normal">{numFormat(data.claimable)} VST</div>
        </div>
        <div className="flex items-center">
          <ChevronDownIcon onClick={handleShow} className={`cursor-pointer ${isShow ? 'rotate-0' : 'rotate-90'}`}></ChevronDownIcon>
        </div>
      </div>
      {isShow && <Positions poolAddress={data.address}></Positions>}
    </div>
  );
};

const MyFarms = () => {
  const myFarmingList = useMyFarmingList();
  return (
    <div className="mt-6">
      {myFarmingList.map((item) => (
        <MyFarmsItem key={item.address} data={item} />
      ))}
    </div>
  );
};

export default MyFarms;

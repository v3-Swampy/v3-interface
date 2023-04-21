import React, { useEffect, useMemo, useState } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import ToolTip from '@components/Tooltip';
import Positions from './Positions';
import dayjs from 'dayjs';
import Corner from './Corner';
import { useMyFarmingList, useStakedPositionsByPool, useCalcRewards } from '@service/farming/myFarms';
import { getCurrentIncentivePeriod, geLiquility } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import { PoolType } from '@service/farming';
import { usePool } from '@service/pairs&pool';
import { useTokenPrice } from '@service/pairs&pool';
import { useAccount } from '@service/account';
import { TokenVST } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';

import { usePools, useMyFarmsList } from '@service/farming/myFarms';

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
    pid: number;
  };
  isActive: boolean;
}> = ({ data, isActive }) => {
  const i18n = useI18n(transitions);

  usePool({
    tokenA: data.token0,
    tokenB: data.token1,
    fee: data.fee,
  });

  const token0Price = useTokenPrice(data.token0.address);
  const token1Price = useTokenPrice(data.token1.address);

  const [isShow, setIsShow] = useState<boolean>(false);
  const positionList = useStakedPositionsByPool(data.address, isActive);
  const { positionsTotalReward, rewardList } = useCalcRewards(positionList, data.pid);
  const currentIncentive = getCurrentIncentivePeriod();
  const staked = useMemo(() => {
    let sum = new Unit(0);
    positionList.map((positionItem) => {
      const liquility = geLiquility(positionItem, token0Price, token1Price);
      sum = sum.add(liquility);
    });
    return sum.toDecimalStandardUnit(5);
  }, [positionList.toString(), token0Price, token1Price]);
  const className = {
    title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
    content: 'color-black-normal text-14px font-500 not-italic leading-18px color-black-normal',
  };

  const handleShow = () => {
    setIsShow(!isShow);
  };

  const claimable = useMemo(() => {
    return new Unit(positionsTotalReward || 0).toDecimalStandardUnit(5, TokenVST.decimals);
  }, [positionsTotalReward]);

  const isEnded = dayjs().isAfter(dayjs.unix(Number(currentIncentive.endTime)));
  if (Array.isArray(positionList) && positionList.length == 0) return null;
  const endTime = useMemo(() => {
    return isActive ? currentIncentive.endTime : Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  }, [isActive, currentIncentive]);
  return (
    <div className={`rounded-2xl mb-6 last:mb-0 py-4 px-4 relative ${isEnded ? 'bg-gray-light/30' : 'bg-orange-light-hover'}`}>
      <Corner timestatmp={endTime}></Corner>
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
          <div className={`${className.content}`}>$ {numFormat(staked)}</div>
        </div>
        <div>
          <div className={`${className.title}`}>
            {i18n.claimable}
            <ToolTip text={i18n.tooltipClaimable}>
              <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
            </ToolTip>
          </div>
          <div className="text-14px font-500 not-italic leading-15px flex items-center color-black-normal">{numFormat(claimable)} VST</div>
        </div>
        <div className="flex items-center">
          <ChevronDownIcon onClick={handleShow} className={`cursor-pointer ${isShow ? 'rotate-0' : 'rotate-90'}`}></ChevronDownIcon>
        </div>
      </div>
      {isShow && (
        <Positions positionList={positionList} token0Price={token0Price} token1Price={token1Price} pid={data.pid} isActive={isActive} rewardList={rewardList || []}></Positions>
      )}
    </div>
  );
};

const MyFarms = () => {
  const account = useAccount();
  // must get pools first
  usePools();
  // then get my farms list
  const myFarmingList = useMyFarmsList();

  console.log('myFarmingList: ', myFarmingList);

  if (!account || !myFarmingList.length) {
    return <div className="mt-4 py-2">Empty List</div>;
  }

  return null;

  // const account = useAccount();
  // const myFarmingList = useMyFarmingList();

  // if (!account) return <></>;
  // return (
  //   <div className="mt-6">
  //     {myFarmingList.map((item) => (
  //       <MyFarmsItem key={`${item.address}-active`} data={item} isActive={true} />
  //     ))}
  //     {myFarmingList.map((item) => (
  //       <MyFarmsItem key={`${item.address}-ended`} data={item} isActive={false} />
  //     ))}
  //   </div>
  // );
};

export default MyFarms;

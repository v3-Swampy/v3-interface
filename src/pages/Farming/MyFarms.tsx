import React, { useMemo, useState, useEffect, useTransition } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import Tooltip from '@components/Tooltip';
import Positions from './Positions';
import dayjs from 'dayjs';
import Corner from './Corner';
import { useMyFarmsList, GroupedPositions, useCalcTotalLiquidity, useRefreshMyFarmsListQuery } from '@service/farming/myFarms';
import { getCurrentIncentivePeriod } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import { useAccount } from '@service/account';
import { TokenVST } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useBoostFactor } from '@service/staking';
import { useTokenPrice } from '@service/pairs&pool';
import classNames from './classNames';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Est. earned',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Est. earned',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
} as const;

const MyFarmsItem: React.FC<{
  data: GroupedPositions;
  isActive: boolean;
}> = ({ data, isActive }) => {
  const i18n = useI18n(transitions);
  const { positions, totalClaimable, token0, token1 } = data;

  const [isShow, setIsShow] = useState<boolean>(false);
  const currentIncentive = getCurrentIncentivePeriod();
  const boosting = useBoostFactor();
  const token0Pirce = useTokenPrice(token0.address);
  const token1Pirce = useTokenPrice(token1.address);
  const totalLiquidity = useCalcTotalLiquidity(positions, token0Pirce || '0', token1Pirce || '0');
  const handleShow = () => {
    setIsShow(!isShow);
  };
  if (Array.isArray(data?.positions) && data?.positions.length == 0) return null;
  const endTime = useMemo(() => {
    // if incentive status is active, we can use the time of incentive, otherwise, we can use any past time to indicate that the current phase is over and that time has passed
    return isActive ? currentIncentive.endTime : currentIncentive.startTime;
  }, [isActive, currentIncentive]);

  const isEnded = useMemo(() => dayjs().isAfter(dayjs.unix(Number(endTime))), [endTime]);

  return (
    <div
      className={`rounded-2xl mb-6 last:mb-0 py-4 px-4 relative ${
        !isActive ? 'bg-gray-light/30 lt-mobile:!border-gray-slight' : 'bg-orange-light-hover lt-mobile:border-orange-light'
      } ${classNames.poolWrapper}`}
    >
      <Corner timestamp={endTime}></Corner>
      <div className="relative px-4 grid grid-cols-18 lt-mobile:px-0">
        <div className="ml-20px col-span-6 lt-mobile:ml-0 lt-mobile:col-span-18 lt-mobile:mb-18px">
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
          <div className={`${classNames.title}`}>{i18n.APR}</div>
          {/* <div className={`${classNames.content} flex items-center lt-mobile:flex-col lt-mobile:items-start`}> */}
          <div className={`${classNames.content} flex items-center`}>
            {/* TODO: hardcode the APR in first stage */}
            <span className="block">Infinity%</span>
            <span className="flex items-center">
              {/* <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:ml-0 lt-mobile:mt-1" /> */}
              <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:w-4" />
              <span className="font-normal font-500 text-12px leading-15px text-green-normal">{boosting}X</span>
            </span>
          </div>
        </div>
        <div className={`col-span-4 lt-mobile:col-span-5 ${classNames.splitLine}`}>
          <div className={`${classNames.title}`}>{i18n.stake}</div>
          <div className={`${classNames.content}`}>${totalLiquidity ? numFormat(totalLiquidity.toFixed(2)) : 0}</div>
        </div>
        <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
          <div className={`${classNames.title}`}>
            {i18n.claimable}
            <Tooltip text={i18n.tooltipClaimable}>
              <span className="w-12px h-12px ml-6px">
                <InfoIcon className="w-12px h-12px" />
              </span>
            </Tooltip>
          </div>
          <div className={`${classNames.content}`}>{totalClaimable ? numFormat(new Unit(totalClaimable).toDecimalStandardUnit(2, TokenVST.decimals)) : 0} VST</div>
        </div>
        {/* TODO should use first one */}
        {/* <div className="flex items-center justify-end col-span-1 lt-mobile:hidden"> */}
        <div className="flex items-center justify-end col-span-1">
          <ChevronDownIcon onClick={handleShow} className={`cursor-pointer ${isShow ? 'rotate-0' : 'rotate-90'}`}></ChevronDownIcon>
        </div>
      </div>
      {isShow && <Positions positionList={positions} pid={data.pid} isEnded={isEnded} token0Pirce={token0Pirce || ''} token1Pirce={token1Pirce || ''}></Positions>}
    </div>
  );
};

const MyFarms = () => {
  const account = useAccount();

  // then get my farms list
  const myFarmingList = useMyFarmsList();
  const [_, startTransition] = useTransition();

  const refreshMyFarmsListQuery = useRefreshMyFarmsListQuery();

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        refreshMyFarmsListQuery();
      });
    }, 15000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!account || (myFarmingList.active.length == 0 && myFarmingList.ended.length == 0)) {
    return <div className="mt-4 py-2">Empty List</div>;
  }

  if (!account) return <></>;
  return (
    <div className="mt-6 lt-mobile:mt-4">
      {myFarmingList?.active.map((item) => (
        <MyFarmsItem key={`${item.address}-active`} data={item} isActive={true} />
      ))}
      {myFarmingList?.ended.map((item) => (
        <MyFarmsItem key={`${item.address}-ended`} data={item} isActive={false} />
      ))}
    </div>
  );
};

export default MyFarms;

import React, { useMemo, useState, useEffect, useTransition } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import { ReactComponent as NoFarms } from '@assets/icons/no_farms.svg';
import { ReactComponent as DoublechevrondownIcon } from '@assets/icons/doublechevrondown.svg';
import Tooltip from '@components/Tooltip';
import Spin from '@components/Spin';
// import Positions from './Positions';
import dayjs from 'dayjs';
import Corner from './Corner';
import { useMyFarms, useRefreshMyFarms } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import { useAccount } from '@service/account';
import { TokenVST } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useBoostFactor } from '@service/staking';
import { useTokenPrice } from '@service/pairs&pool';
import classNames from '../classNames';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'Your Supply',
    claimable: 'Est. earned',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'Your Supply',
    claimable: 'Est. earned',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
} as const;

const MyFarmsItem: React.FC<{
  data: NonNullable<ReturnType<typeof useMyFarms>>[number];
}> = ({ data }) => {
  const i18n = useI18n(transitions);
  const { positions, pool } = data;

  const [isShow, setIsShow] = useState<boolean>(false);
  const boosting = useBoostFactor();
  const token0Price = useTokenPrice(data.pool.pairInfo.token0?.address);
  const token1Price = useTokenPrice(data.pool.pairInfo.token1?.address);
  // const totalLiquidity = useCalcTotalLiquidity(positions, token0Price || '0', token1Price || '0');
  const inFetchingTokenPrice = token0Price === undefined || token1Price === undefined;

  const handleShow = () => {
    setIsShow(!isShow);
  };


  if (Array.isArray(data?.positions) && data?.positions.length == 0) return null;
  return (
    <div
      className={`rounded-2xl mb-6 last:mb-0 py-4 px-4 relative bg-orange-light-hover lt-mobile:border-orange-light lt-mobile:p-0 lt-mobile:border-solid lt-mobile:border-1px ${classNames.poolWrapper}`}
    >
      <Corner timestamp={data.VSTIncentiveEndAt!}></Corner>
      <div
        className={`
          relative px-4 grid grid-cols-18 lt-mobile:px-0  bg-orange-light-hover lt-mobile:border-orange-light
          lt-mobile:rounded-14px lt-mobile:border-b-solid lt-mobile:border-1px lt-mobile:px-2 lt-mobile:py-4
        `}
      >
        <div className="ml-20px col-span-6 lt-mobile:ml-0 lt-mobile:col-span-18 lt-mobile:mb-18px">
          <div className={`${classNames.title}`}>{i18n.poolName}</div>
          <div className={`${classNames.content} inline-flex justify-center items-center`}>
            <TokenPair
              position={
                {
                  leftToken: data.pool.pairInfo.leftToken,
                  rightToken: data.pool.pairInfo.rightToken,
                  fee: data.pool.pairInfo.fee,
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
            {/* TODO: should display my farms apr */}
            <span className="">Infinity%</span>
            <span className="flex items-center">
              {/* <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:ml-0 lt-mobile:mt-1" /> */}
              <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:w-4" />
              <span className="font-normal font-normal text-12px leading-15px text-green-normal">{boosting}X</span>
            </span>
          </div>
        </div>
        <div className={`col-span-4 lt-mobile:col-span-5 ${classNames.splitLine}`}>
          <div className={`${classNames.title}`}>{i18n.stake}</div>
          <div className={`${classNames.content} leading-20px`}>
            {inFetchingTokenPrice ? <Spin className="ml-8px text-20px" /> : 1}
          </div>
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
          {/* <div className={`${classNames.content}`}>{totalClaimable ? numFormat(new Unit(totalClaimable).toDecimalStandardUnit(2, TokenVST.decimals)) : 0} VST</div> */}
          <div className={`${classNames.content}`}>1 VST</div>
        </div>
        <div className="flex items-center justify-end col-span-1 lt-mobile:hidden">
          <ChevronDownIcon onClick={handleShow} className={`cursor-pointer ${isShow ? 'rotate-180' : 'rotate-0'}`}></ChevronDownIcon>
        </div>
      </div>
      {false && <Positions positionList={positions} pid={data.pid} isEnded={isEnded} token0Price={token0Price || ''} token1Price={token1Price || ''}></Positions>}
      <div className={`hidden lt-mobile:block lt-mobile:bg-white-normal lt-mobile:-mb-0 lt-mobile:rounded-2xl lt-mobile:-mt-4 lt-mobile:pt-4`}>
        <div className="h-28px flex items-center justify-center">
          <DoublechevrondownIcon onClick={handleShow} className={`cursor-pointer w-24px h-24px ${isShow ? 'rotate-180' : 'rotate-0'}`}></DoublechevrondownIcon>
        </div>
      </div>
    </div>
  );
};

const MyFarms = () => {
  const account = useAccount();

  const myFarms = useMyFarms();
  console.log('myFarms', myFarms);
  const refreshMyFarms = useRefreshMyFarms();

  const [_, startTransition] = useTransition();
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     startTransition(() => {
  //       refreshMyFarms();
  //     });
  //   }, 15000);
  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, []);

  if (!account || !myFarms?.length) {
    return (
      <div className="mt-4 pt-112px pb-168px flex flex-1 flex-col items-center justify-center">
        <NoFarms className="w-120px h-120px mb-2" />
        <span className="text-14px leading-18px text-gray-normal">No Farms</span>
      </div>
    );
  }

  if (!account) return <></>;
  return (
    <div className="mt-6 lt-mobile:mt-4">
      {myFarms?.map((item) => (
        <MyFarmsItem key={`${item.VSTIncentiveEndAt}-${item.pool.poolAddress}`} data={item}  />
      ))}
    </div>
  );
};

export default MyFarms;

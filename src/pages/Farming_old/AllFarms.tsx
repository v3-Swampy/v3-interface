import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import Tooltip from '@components/Tooltip';
import showStakeLPModal from './StakeLPModal';
import { useAllPools, useCurrentIncentive } from '@service/farming_old';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
import { useTokenPrice } from '@service/pairs&pool';
import { TokenVST } from '@service/tokens';
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

const AllFarmsItem: React.FC<{ data: ReturnType<typeof useAllPools>[number] }> = ({ data }) => {
  const i18n = useI18n(transitions);
  const token0Price = useTokenPrice(data.token0.address);
  const token1Price = useTokenPrice(data.token1.address);
  const vstPrice = useTokenPrice(TokenVST.address);
  const currentIncentive = useCurrentIncentive();

  const tvl = useMemo(() => {
    if (token0Price && token1Price && data?.amount0 && data?.amount1) {
      return data.amount0.mul(token0Price).add(data.amount1.mul(token1Price));
    }
    return null;
  }, [token0Price, token1Price, data?.amount0, data?.amount1]);

  const tvlDisplay = useMemo(() => {
    if (tvl) {
      return `$${numberWithCommas(trimDecimalZeros(tvl.toDecimalStandardUnit(2)))}`;
    }
    return '--';
  }, [tvl]);

  const range = useMemo(() => {
    if (!currentIncentive?.period || !vstPrice || !data?.amount0 || !data?.amount1 || !data?.allocPoint || !data?.totalAllocPoint || !tvl) return null;
    const rewardRatePerSecond = currentIncentive.period.amount / (currentIncentive.period.endTime - currentIncentive.period.startTime);
    const APRHigh = new Decimal(rewardRatePerSecond).mul(data.allocPoint).div(data.totalAllocPoint).mul(vstPrice).div(tvl.toDecimal()).mul(31536000);
    const APRLow = APRHigh.mul(0.33);
    return [APRLow.toFixed(2), APRHigh.toFixed(2)] as const;
  }, [currentIncentive?.index, vstPrice, data?.amount0, data?.amount1, data?.allocPoint, data?.totalAllocPoint, tvl]);

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
        <div className={`${classNames.content}`}>{range ? `${range[0]}% ~ ${range[1]}%` : (token0Price === undefined || token1Price === undefined || vstPrice === undefined) ? <Spin /> : '--'}</div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.tvl}</div>
        <div className={`${classNames.content}`}>{(token0Price === undefined || token1Price === undefined) ? <Spin /> : tvlDisplay}</div>
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
        <div className={classNames.content}>{data.multiplier}X</div>
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
  const poolList = useAllPools();

  return (
    <div className="mt-6 lt-mobile:mt-4">
      {poolList.map((p: any) => (
        <AllFarmsItem key={p.address} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

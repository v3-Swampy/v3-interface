import React, { useMemo, useState, useEffect } from 'react';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import Tooltip from '@components/Tooltip';
import { usePools, useCurrentIncentiveKey } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
import { useTokenPrice, getTokensPrice } from '@service/pairs&pool';
import { TokenVST } from '@service/tokens';
import classNames from './classNames';
import showStakeLPModal from './StakeLPModal';

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

const AllFarmsItem: React.FC<{ data: NonNullable<ReturnType<typeof usePools>>[number] }> = ({ data }) => {
  const i18n = useI18n(transitions);
  const token0Price = useTokenPrice(data.pairInfo.token0?.address);
  const token1Price = useTokenPrice(data.pairInfo.token1?.address);

  const tvl = useMemo(() => {
    if (token0Price && token1Price && data?.incentives?.[0]?.token0Amount && data?.incentives?.[0]?.token1Amount) {
      const token0Amount = new Decimal(data.incentives[0].token0Amount.toString());
      const token1Amount = new Decimal(data.incentives[0].token1Amount.toString());
      return token0Amount
        .div(new Decimal(10 ** (data.pairInfo.token0?.decimals ?? 18))).mul(token0Price)
        .add(token1Amount.div(new Decimal(10 ** (data.pairInfo.token1?.decimals ?? 18))).mul(token1Price));
    }
    return null;
  }, [token0Price, token1Price, data?.incentives?.[0]?.token0Amount, data?.incentives?.[0]?.token1Amount]);

  const tvlDisplay = useMemo(() => {
    if (tvl) {
      return `$${numberWithCommas(trimDecimalZeros(tvl.toFixed(2)))}`;
    }
    return '--';
  }, [tvl]);

  const rewardTokenAddresses = useMemo(() => {
    if (!data?.incentiveKeys) return [];
    const addresses = data.incentiveKeys.map(key => key.rewardToken);
    return [...new Set(addresses)];
  }, [data?.incentiveKeys]);

  const [rewardTokenPrices, setRewardTokenPrices] = useState<{ [key: string]: string | null }>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (!rewardTokenAddresses.length) {
      setRewardTokenPrices({});
      setPricesLoading(false);
      return;
    }

    setPricesLoading(true);
    
    getTokensPrice(rewardTokenAddresses)
      .then(priceMap => {
        setRewardTokenPrices(priceMap);
      })
      .catch(error => {
        console.warn('Failed to fetch reward token prices:', error);
        setRewardTokenPrices({});
      })
      .finally(() => {
        setPricesLoading(false);
      });
  }, [rewardTokenAddresses]);

  const aprData = useMemo(() => {
    if (!data?.incentiveKeys || !data?.incentives || !tvl) return null;

    const rewardTokenAprs: { [tokenAddress: string]: { low: string; high: string; symbol?: string } } = {};
    let totalRewardsPerSecond = new Decimal(0);

    data.incentiveKeys.forEach((key, index) => {
      const incentive = data.incentives[index];
      if (!incentive || !key.inTimeRange || incentive.isEmpty) return;

      const rewardTokenPrice = rewardTokenPrices[key.rewardToken];
      if (!rewardTokenPrice) return;

      const rewardToken = data.rewards.find(r => r.token?.address === key.rewardToken);
      const rewardTokenDecimals = rewardToken?.token?.decimals ?? 18;

      const rewardValuePerSecond = new Decimal(incentive.rewardRate.toString())
        .div(new Decimal(10).pow(rewardTokenDecimals))
        .mul(rewardTokenPrice);

      totalRewardsPerSecond = totalRewardsPerSecond.add(rewardValuePerSecond);

      const baseAPR = rewardValuePerSecond
        .div(tvl)
        .mul(31536000);

      rewardTokenAprs[key.rewardToken] = {
        low: baseAPR.toFixed(2),
        high: baseAPR.mul(3).toFixed(2),
        symbol: rewardToken?.token?.symbol
      };
    });

    const totalBaseAPR = totalRewardsPerSecond
      .div(tvl)
      .mul(31536000);

    const totalAprRange = {
      low: totalBaseAPR.toFixed(2),
      high: totalBaseAPR.mul(3).toFixed(2)
    };

    return {
      rewardTokenAprs,
      totalAprRange,
      hasValidData: !totalRewardsPerSecond.isZero()
    };
  }, [data?.incentiveKeys, data?.incentives, data?.rewards, tvl, rewardTokenPrices]);

  const isLoadingPrices = pricesLoading;

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
                leftToken: data.pairInfo.leftToken,
                rightToken: data.pairInfo.rightToken,
                fee: data.pairInfo.fee,
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
        <div className={`${classNames.content}`}>
          {isLoadingPrices ? (
            <Spin />
          ) : aprData?.hasValidData ? (
            `${aprData.totalAprRange.low}% ~ ${aprData.totalAprRange.high}%`
          ) : (
            '--'
          )}
        </div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.tvl}</div>
        <div className={`${classNames.content}`}>{token0Price === undefined || token1Price === undefined ? <Spin /> : tvlDisplay}</div>
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
        {/* <div className={classNames.content}>{data.multiplier}X</div> */}
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
  const pools = usePools();
  console.log(pools);

  if (!pools) return null;
  return (
    <div className="mt-6 lt-mobile:mt-4">
      {pools.map((p) => (
        <AllFarmsItem key={p.poolAddress} data={p} />
      ))}
    </div>
  );
};

export default AllFarms;

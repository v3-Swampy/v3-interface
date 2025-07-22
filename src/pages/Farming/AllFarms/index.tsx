import React, { memo, useMemo, useState, useEffect } from 'react';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import { usePools } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
import Dropdown from '@components/Dropdown';
import BorderBox from '@components/Box/BorderBox';
import { useTokenPrice, getTokensPrice } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import classNames from '../classNames';
import showStakeLPModal from './StakeLPModal';
import MiningIcon from '@assets/imgs/mining.png';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    rewards: 'Rewards',
    stakeLP: 'Stake LP',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    rewards: 'Rewards',
    stakeLP: 'Stake LP',
  },
} as const;

export const RewardsDetail: React.FC<{ rewards: NonNullable<ReturnType<typeof usePools>>[number]['rewards'] }> = memo(({ rewards }) => {
  return (
    <BorderBox variant="gradient-white" className="max-w-90vw p-24px rounded-28px">
      {rewards?.map((reward) => (
        <div className="flex items-center gap-4px" key={reward.token?.address}>
          <img src={reward.token?.logoURI} alt={reward.token?.symbol} className="w-20px h-20px" />
          <span className="text-12px text-black-normal font-medium">
            {numberWithCommas(trimDecimalZeros(new Decimal(reward.unreleasedAmount.toString()).div(new Decimal(10).pow(reward.token?.decimals ?? 18)).toFixed(2)))}{' '}
            {reward.token?.symbol}
          </span>
        </div>
      ))}
    </BorderBox>
  );
});

interface APRData {
  rewardTokenAPRs: {
    [tokenAddress: string]: {
      low: string;
      high: string;
      token: Token;
    };
  };
  totalAprRange: {
    low: string;
    high: string;
  };
  hasValidData: boolean;
}

const APRDetail: React.FC<{ aprData: APRData }> = memo(({ aprData }) => {
  if (!aprData) return null;
  return (
    <BorderBox variant="gradient-white" className="max-w-90vw w-370px p-16px rounded-28px">
      <p className="text-12px text-black-normal font-medium leading-20px">Estimated according to trading activity in the past24 hours plus mining and farming rewards</p>
      <div className="mt-18px mb-12px text-18px text-black-normal font-medium flex items-center">
        Mining
        <img src={MiningIcon} alt="Mining" className="ml-5px w-20px h-20px" />
      </div>
      {Object.entries(aprData?.rewardTokenAPRs ?? {}).map(([tokenAddress, { low, high, token }]) => (
        <div className="mt-10px flex items-center justify-between text-14px text-black-normal" key={tokenAddress}>
          <span>{token.symbol} Rewards</span>
          <span>{low}% ~ {high}%</span>
        </div>
      ))}

      <BorderBox variant="gradient-white" className="h-0 border-1px border-b-0 bg-black-normal/10 mt-18px mb-12px" />

      <div className="flex items-center justify-between text-18px leading-22px text-black-normal font-medium">
        <span>Total APR</span>
        <span>{aprData?.totalAprRange.low}% ~ {aprData?.totalAprRange.high}%</span>
      </div>
    </BorderBox>
  );
});

const AllFarmsItem: React.FC<{ data: NonNullable<ReturnType<typeof usePools>>[number] }> = ({ data }) => {
  const i18n = useI18n(transitions);
  const token0Price = useTokenPrice(data.pairInfo.token0?.address);
  const token1Price = useTokenPrice(data.pairInfo.token1?.address);

  const tvl = useMemo(() => {
    if (token0Price && token1Price && data?.incentives?.[0]?.token0Amount && data?.incentives?.[0]?.token1Amount) {
      const token0Amount = new Decimal(data.incentives[0].token0Amount.toString());
      const token1Amount = new Decimal(data.incentives[0].token1Amount.toString());
      return token0Amount
        .div(new Decimal(10 ** (data.pairInfo.token0?.decimals ?? 18)))
        .mul(token0Price)
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
    const addresses = data.incentiveKeys.map((key) => key.rewardToken);
    return [...new Set(addresses)];
  }, [data?.incentiveKeys]);

  const [rewardTokenPrices, setRewardTokenPrices] = useState<{ [key: string]: string | null } | null | undefined>(undefined);

  useEffect(() => {
    if (!rewardTokenAddresses.length) {
      setRewardTokenPrices(null);
      return;
    }

    getTokensPrice(rewardTokenAddresses)
      .then(setRewardTokenPrices)
      .catch((error) => {
        console.warn('Failed to fetch reward token prices:', error);
        setRewardTokenPrices(null);
      });
  }, [rewardTokenAddresses]);

  const aprData = useMemo(() => {
    if (!data?.incentiveKeys || !data?.incentives || !tvl || !rewardTokenPrices) return null;

    const rewardTokenAPRs: { [tokenAddress: string]: { low: string; high: string; token: Token } } = {};
    const rewardTokenValues: { [tokenAddress: string]: { value: Decimal; token: Token } } = {};
    let totalRewardsPerSecond = new Decimal(0);

    data.incentiveKeys.forEach((key, index) => {
      const incentive = data.incentives[index];
      if (!incentive || key.status !== 'active' || incentive.isEmpty) return;

      const rewardTokenPrice = rewardTokenPrices[key.rewardToken];
      if (!rewardTokenPrice) return;

      const rewardToken = data.rewards.find((r) => r.token?.address?.toLowerCase() === key.rewardToken.toLowerCase())?.token;
      if (!rewardToken) return;

      const rewardValuePerSecond = new Decimal(incentive.rewardRate.toString()).div(new Decimal(10).pow(rewardToken.decimals)).mul(rewardTokenPrice);
      totalRewardsPerSecond = totalRewardsPerSecond.add(rewardValuePerSecond);

      const tokenAddressKey = key.rewardToken.toLowerCase();

      if (rewardTokenValues[tokenAddressKey]) {
        rewardTokenValues[tokenAddressKey].value = rewardTokenValues[tokenAddressKey].value.add(rewardValuePerSecond);
      } else {
        rewardTokenValues[tokenAddressKey] = { value: rewardValuePerSecond, token: rewardToken };
      }
    });

    Object.entries(rewardTokenValues).forEach(([tokenAddress, { value, token }]) => {
      const baseAPR = value.div(tvl).mul(31536000);
      rewardTokenAPRs[tokenAddress] = {
        low: baseAPR.toFixed(2),
        high: baseAPR.mul(3).toFixed(2),
        token,
      };
    });

    const totalBaseAPR = totalRewardsPerSecond.div(tvl).mul(31536000);

    const totalAprRange = {
      low: totalBaseAPR.toFixed(2),
      high: totalBaseAPR.mul(3).toFixed(2),
    };

    return {
      rewardTokenAPRs,
      totalAprRange,
      hasValidData: !totalRewardsPerSecond.isZero(),
    };
  }, [data?.incentiveKeys, data?.incentives, data?.rewards, tvl, rewardTokenPrices]);

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
          <Dropdown Content={<APRDetail aprData={aprData!} />} placement="top" trigger="mouseenter">
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px" />
            </span>
          </Dropdown>
        </div>
        <div className={`${classNames.content}`}>
          {rewardTokenPrices === undefined ? <Spin /> : aprData?.hasValidData ? `${aprData.totalAprRange.low}% ~ ${aprData.totalAprRange.high}%` : '--'}
        </div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.tvl}</div>
        <div className={`${classNames.content}`}>{token0Price === undefined || token1Price === undefined ? <Spin /> : tvlDisplay}</div>
      </div>
      <div className={`col-span-2 lt-mobile:col-span-4 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>
          {i18n.rewards}
          <Dropdown Content={<RewardsDetail rewards={data.rewards} />} placement="top" trigger="mouseenter">
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px" />
            </span>
          </Dropdown>
        </div>
        <div className={cx(classNames.content, 'flex items-center gap-2px')}>
          {data.rewards?.map?.((reward) => (
            <img key={reward.token?.address} src={reward.token?.logoURI} alt={reward.token?.symbol} className="w-20px h-20px" />
          ))}
        </div>
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

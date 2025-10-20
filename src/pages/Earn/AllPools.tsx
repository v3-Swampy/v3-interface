import React, { memo, useMemo, useState, useEffect } from 'react';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import { usePools, useCanClaim } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
import Dropdown from '@components/Dropdown';
import BorderBox from '@components/Box/BorderBox';
import { useTokenPrice, getTokensPrice } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import MiningIcon from '@assets/imgs/mining.png';

const classNames = {
  title: 'flex items-center color-gray-normal text-xs not-italic leading-15px mb-8px lt-mobile:mb-4px',
  content: 'color-black-normal text-14px font-normal not-italic leading-18px lt-mobile:text-12px lt-mobile:leading-15px',
  authConnectButton:
    'flex items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-normal whitespace-nowrap not-italic color-orange-normal cursor-pointer lt-mobile:border-1 lt-mobile:text-14px',
  splitLine: `lt-mobile:before:content-[''] lt-mobile:before:border-0 lt-mobile:before:border-l-1px lt-mobile:before:border-solid lt-mobile:before:absolute lt-mobile:before:top-2px lt-mobile:before:bottom-2px lt-mobile:relative lt-mobile:before:-left-2 lt-mobile:before:border-color-orange-light`,
  poolWrapper: 'lt-mobile:mb-4 lt-mobile:rounded-14px',
  symbol: 'lt-mobile:font-normal lt-mobile:text-14px lt-mobile:leading-18px',
  fee: 'lt-mobile:h-18px lt-mobile:text-12px lt-mobile:leading-18px',
};


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

interface APRData {
  rewardTokenAPRs: {
    [tokenAddress: string]: {
      apr: string;
      token: Token;
    };
  };
  totalApr: string;
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
      {Object.entries(aprData?.rewardTokenAPRs ?? {}).map(([tokenAddress, { apr, token }]) => (
        <div className="mt-10px flex items-center justify-between text-14px text-black-normal" key={tokenAddress}>
          <span>{token.symbol} Rewards</span>
          <span>{apr}%</span>
        </div>
      ))}

      <BorderBox variant="gradient-white" className="h-0 border-1px border-b-0 bg-black-normal/10 mt-18px mb-12px" />

      <div className="flex items-center justify-between text-18px leading-22px text-black-normal font-medium">
        <span>Total APR</span>
        <span>{aprData?.totalApr}%</span>
      </div>
    </BorderBox>
  );
});

const AllFarmsItem: React.FC<{ data: NonNullable<ReturnType<typeof usePools>>[number] }> = ({ data }) => {
  const i18n = useI18n(transitions);
  const isCanClaim = useCanClaim();
  const token0Price = useTokenPrice(data.pairInfo.token0?.address);
  const token1Price = useTokenPrice(data.pairInfo.token1?.address);

  const tvl = useMemo(() => {
    if (!token0Price || !token1Price || !data?.incentives?.length) return null;
    // 计算每个 incentive 的美元价值
    const tvlValues = data.incentives.map((incentive) => {
      if (incentive?.token0Amount && incentive?.token1Amount) {
        const token0Amount = new Decimal(incentive.token0Amount.toString());
        const token1Amount = new Decimal(incentive.token1Amount.toString());
        const token0Value = token0Amount.div(new Decimal(10 ** (data.pairInfo.token0?.decimals ?? 18))).mul(token0Price);
        const token1Value = token1Amount.div(new Decimal(10 ** (data.pairInfo.token1?.decimals ?? 18))).mul(token1Price);
        return token0Value.add(token1Value);
      }
      return new Decimal(0);
    });
    if (tvlValues.length === 0) return null;
    return Decimal.max(...tvlValues);
  }, [token0Price, token1Price, data?.incentives, data?.pairInfo.token0?.decimals, data?.pairInfo.token1?.decimals]);

  const tvlDisplay = useMemo(() => {
    if (tvl) {
      return `$${numberWithCommas(trimDecimalZeros(tvl.toFixed(2)))}`;
    }
    return '--';
  }, [tvl]);

  const rewardTokenAddresses = useMemo(() => {
    if (!data?.incentiveKeys) return [];
    const addresses = data.incentiveKeys.map((key) => key.rewardToken.toLowerCase());
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

  const aprData: APRData | null = useMemo(() => {
    if (!data?.incentiveKeys || !data?.incentives || !tvl || !rewardTokenPrices) return null;

    const rewardTokenAPRs: { [tokenAddress: string]: { apr: string; token: Token } } = {};
    const rewardTokenValues: { [tokenAddress: string]: { value: Decimal; token: Token } } = {};
    let totalRewardsPerSecond = new Decimal(0);

    data.incentiveKeys.forEach((key, index) => {
      const incentive = data.incentives[index];
      if (!incentive || key.status !== 'active' || incentive.isEmpty) return;

      const rewardTokenAddress = key.rewardToken.toLowerCase();

      const rewardTokenPrice = rewardTokenPrices[rewardTokenAddress];
      if (!rewardTokenPrice) return;

      const rewardToken = data.rewards.find((r) => r.token?.address?.toLowerCase() === rewardTokenAddress)?.token;
      if (!rewardToken) return;

      const rewardValuePerSecond = new Decimal(incentive.rewardRate.toString()).div(new Decimal(10).pow(rewardToken.decimals)).mul(rewardTokenPrice);
      totalRewardsPerSecond = totalRewardsPerSecond.add(rewardValuePerSecond);


      if (rewardTokenValues[rewardTokenAddress]) {
        rewardTokenValues[rewardTokenAddress].value = rewardTokenValues[rewardTokenAddress].value.add(rewardValuePerSecond);
      } else {
        rewardTokenValues[rewardTokenAddress] = { value: rewardValuePerSecond, token: rewardToken };
      }
    });

    data.rewards.forEach(({ token }) => {
      if (!token) return;
      const tokenAddress = token.address.toLowerCase();
      const value = rewardTokenValues[tokenAddress]?.value;
      if (!rewardTokenPrices[tokenAddress] || !value)
        rewardTokenAPRs[tokenAddress] = {
          apr: 'Infinity',
          token,
        };
      else {
        const baseAPR = value.div(tvl).mul(31536000);
        rewardTokenAPRs[tokenAddress] = {
          apr: baseAPR.toFixed(2),
          token,
        };
      }
    });

    const totalBaseAPR = totalRewardsPerSecond.div(tvl).mul(31536000);

    const totalApr = totalBaseAPR.toFixed(2);

    return {
      rewardTokenAPRs,
      totalApr,
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
          {i18n.APR}
          <Dropdown Content={<APRDetail aprData={aprData!} />} placement="top" trigger="mouseenter">
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px" />
            </span>
          </Dropdown>
        </div>
        <div className={`${classNames.content}`}>
          {isCanClaim ? rewardTokenPrices === undefined ? <Spin /> : aprData?.hasValidData ? `${aprData.totalApr}%` : '0%' : 'Infinity%'}
        </div>
      </div>
      <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.tvl}</div>
        <div className={`${classNames.content}`}>{token0Price === undefined || token1Price === undefined ? <Spin /> : tvlDisplay}</div>
      </div>
      <div className={`col-span-2 lt-mobile:col-span-4 ${classNames.splitLine}`}>
        <div className={`${classNames.title}`}>{i18n.rewards}</div>
        <div className={cx(classNames.content, 'flex items-center gap-2px')}>
          {data.rewards
            ?.filter((reward): reward is { token: Token } => !!reward.token)
            .map((reward) => (
              <img key={reward.token.address} src={reward.token.logoURI ?? ''} alt={reward.token.symbol} className="w-20px h-20px" />
            ))}
        </div>
      </div>
      <div className="flex items-center justify-end col-span-3 lt-mobile:absolute lt-mobile:right-2 lt-mobile:top-4">
        {/* <AuthConnectButton className={classNames.authConnectButton} id="all-farms-stake-lp-show-modal-auth-connect">
          <div className={classNames.authConnectButton} onClick={() => showStakeLPModal(data)} id="all-farms-stake-lp-show-modal">
            {i18n.stakeLP}
          </div>
        </AuthConnectButton> */}
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

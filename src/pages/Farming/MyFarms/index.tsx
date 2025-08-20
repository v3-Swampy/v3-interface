import React, { useMemo, useState, useEffect, startTransition } from 'react';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { trimDecimalZeros } from '@utils/numberUtils';
import cx from 'clsx';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import { ReactComponent as NoFarms } from '@assets/icons/no_farms.svg';
import { ReactComponent as DoublechevrondownIcon } from '@assets/icons/doublechevrondown.svg';
import Spin from '@components/Spin';
import Positions from './Positions';
import { useMyFarms, useCanClaim } from '@service/farming';
import TokenPair from '@modules/Position/TokenPair';
import { type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useTokenPrice, getTokensPrice } from '@service/pairs&pool';
import classNames from '../classNames';

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'Your Supply',
    rewards: 'Rewards',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'Your Supply',
    rewards: 'Rewards',
    tooltipClaimable: 'Your estimated earned rewards, affected by Ending Time and Boosting Coefficient.',
  },
} as const;

const MyFarmsItem: React.FC<{
  data: NonNullable<ReturnType<typeof useMyFarms>>[number];
}> = ({ data }) => {
  const i18n = useI18n(transitions);
  const isCanClaim = useCanClaim();
  const { positions } = data;

  const [isShow, setIsShow] = useState<boolean>(false);

  const token0Price = useTokenPrice(data.pool.pairInfo.token0?.address);
  const token1Price = useTokenPrice(data.pool.pairInfo.token1?.address);

  const supplies = useMemo(() => {
    return positions?.map((item) => {
      const { amount0, amount1, token0, token1 } = item.position ?? {};
      const token0Liquidity = token0Price && amount0 ? amount0.mul(token0Price).toDecimalStandardUnit(undefined, token0?.decimals) : '';
      const token1Liquidity = token1Price && amount1 ? amount1.mul(token1Price).toDecimalStandardUnit(undefined, token1?.decimals) : '';
      return token0Liquidity && token1Liquidity ? trimDecimalZeros(new Unit(token0Liquidity).add(token1Liquidity).toDecimalMinUnit(2)) : undefined;
    });
  }, [positions, token0Price, token1Price]);

  const totalSupply = useMemo(() => {
    if (!supplies.every(Boolean)) return undefined;

    const total = supplies.reduce((acc, item) => {
      if (!item) return acc;
      return acc.add(new Decimal(item));
    }, new Decimal(0));

    return trimDecimalZeros(total.toFixed(2));
  }, [supplies]);

  const totalActiveSupply = useMemo(() => {
    if (!supplies.every(Boolean)) return undefined;
    return supplies
      .filter((_, index) => positions[index].isPositionActive)
      .reduce((acc, item) => {
        if (!item) return acc;
        return acc.add(new Decimal(item));
      }, new Decimal(0));
  }, [supplies]);

  const [rewardTokenPrices, setRewardTokenPrices] = useState<{ [key: string]: string | null } | null | undefined>(undefined);

  useEffect(() => {
    if (!data?.activeRewards?.length) {
      setRewardTokenPrices(null);
      return;
    }

    getTokensPrice(data.activeRewards.map((reward) => reward.rewardTokenInfo?.address!))
      .then(setRewardTokenPrices)
      .catch((error) => {
        console.warn('Failed to fetch reward token prices:', error);
        setRewardTokenPrices(null);
      });
  }, [data?.activeRewards]);

  const apr = useMemo(() => {
    if (!data?.activeRewards?.length || !totalActiveSupply || !rewardTokenPrices) return null;

    const allActiveRewardRate = data.activeRewards.reduce((sum, reward) => {
      const rewardTokenAddress = reward.rewardTokenInfo?.address;
      if (!rewardTokenAddress) return sum;

      const rewardTokenPrice = rewardTokenPrices[rewardTokenAddress];
      if (!rewardTokenPrice) return sum;

      const rewardRatePerSecond = new Decimal(reward.stakeReward.rewardsPerSecondX32.toString()).div(Math.pow(2, 32));
      const rewardValuePerSecond = rewardRatePerSecond.div(new Decimal(10).pow(reward.rewardTokenInfo!.decimals)).mul(rewardTokenPrice);

      return sum.add(rewardValuePerSecond);
    }, new Decimal(0));

    if (totalActiveSupply.eq(0) || allActiveRewardRate.eq(0)) return `0%`;

    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const aprValue = allActiveRewardRate.div(totalActiveSupply).mul(SECONDS_PER_YEAR);

    return `${aprValue.mul(100).toFixed(2)}%`;
  }, [data?.activeRewards, totalActiveSupply, rewardTokenPrices]);

  const boostRatio = useMemo(() => {
    if (!positions) return 0;
    let totalLiquidity = new Decimal(0);
    let totalBoostLiquidity = new Decimal(0);

    positions.forEach((position) => {
      position.activeRewards.forEach((reward) => {
        totalLiquidity = totalLiquidity.add(new Decimal(reward.stakeReward.liquidity.toString()));
        totalBoostLiquidity = totalBoostLiquidity.add(new Decimal(reward.stakeReward.boostedLiquidity.toString()));
      });
    });

    if (totalLiquidity.eq(0)) return 0;

    const boostRatio = totalBoostLiquidity.div(totalLiquidity).mul(100).div(33);

    return boostRatio.toFixed(2);
  }, [positions]);

  const inFetchingTokenPrice = token0Price === undefined || token1Price === undefined;

  const handleShow = () => {
    setIsShow(!isShow);
  };

  if (Array.isArray(data?.positions) && data?.positions.length == 0) return null;
  return (
    <div
      className={`rounded-2xl mb-6 last:mb-0 py-4 px-4 relative bg-orange-light-hover lt-mobile:border-orange-light lt-mobile:p-0 lt-mobile:border-solid lt-mobile:border-1px ${classNames.poolWrapper}`}
    >
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
            <span className="">{isCanClaim ? !apr ? <Spin className="ml-8px text-20px" /> : apr : 'Infinity%'}</span>
            <span className="flex items-center">
              {/* <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:ml-0 lt-mobile:mt-1" /> */}
              <LightningIcon className="w-5 h-5 mx-0.5 ml-2 lt-mobile:w-4" />
              <span className="font-normal font-normal text-12px leading-15px text-green-normal">{boostRatio}X</span>
            </span>
          </div>
        </div>
        <div className={`col-span-4 lt-mobile:col-span-5 ${classNames.splitLine}`}>
          <div className={`${classNames.title}`}>{i18n.stake}</div>
          <div className={`${classNames.content} leading-20px`}>{inFetchingTokenPrice ? <Spin className="ml-8px text-20px" /> : `$${totalSupply}`}</div>
        </div>
        <div className={`col-span-3 lt-mobile:col-span-5 ${classNames.splitLine}`}>
          <div className={`${classNames.title}`}>{i18n.rewards}</div>
          <div className={cx(classNames.content, 'flex items-center gap-2px')}>
            {data.pool.rewards
              ?.filter((reward): reward is { token: Token } => !!reward.token)
              .map((reward: { token: Token }) => (
                <img key={reward.token.address} src={reward.token.logoURI ?? ''} alt={reward.token.symbol} className="w-20px h-20px" />
              ))}
          </div>
        </div>
        <div className="flex items-center justify-end col-span-1 lt-mobile:hidden">
          <ChevronDownIcon onClick={handleShow} className={`cursor-pointer ${isShow ? 'rotate-180' : 'rotate-0'}`}></ChevronDownIcon>
        </div>
      </div>
      {isShow && <Positions positions={positions} supplies={supplies} />}
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

  if (!account || !myFarms?.length) {
    return (
      <div className="mt-4 pt-112px pb-168px flex flex-1 flex-col items-center justify-center">
        <NoFarms className="w-120px h-120px mb-2" />
        <span className="text-14px leading-18px text-gray-normal">No Farms</span>
      </div>
    );
  }

  return (
    <div className="mt-6 lt-mobile:mt-4">
      {myFarms?.map((item) => (
        <MyFarmsItem key={item.pool.poolAddress} data={item} />
      ))}
    </div>
  );
};

export default MyFarms;

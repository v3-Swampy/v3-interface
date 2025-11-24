import React, { useState, useMemo, useEffect } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { usePool } from '@service/pairs&pool';
import { usePools } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice, FeeAmount, useTokenPrice } from '@service/pairs&pool';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { type Token } from '@service/tokens';
import { formatDisplayAmount } from '@utils/numberUtils';
import { useAccount } from '@service/account';

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface Props {
  tokenA: Token;
  tokenB: Token;
  amountTokenA: string;
  amountTokenB: string;
  fee: FeeAmount;
}

const ExpectedReward: React.FC<Props> = ({ tokenA, tokenB, fee, amountTokenA, amountTokenB }) => {
  const account = useAccount();
  const { pool } = usePool({ tokenA, tokenB, fee });
  const pools = usePools();
  const matchedPool = useMemo(() => pools?.find((p) => p.poolAddress.toLowerCase() === pool?.address?.toLowerCase()), [pools, pool?.address]);

  const tokenAPrice = useTokenPrice(tokenA?.address);
  const tokenBPrice = useTokenPrice(tokenB?.address);
  const tokenALiquidity = useMemo(() => (tokenAPrice && amountTokenA ? new Unit(amountTokenA).mul(tokenAPrice) : new Unit(0)), [tokenAPrice, amountTokenA]);
  const tokenBLiquidity = useMemo(() => (tokenBPrice && amountTokenB ? new Unit(amountTokenB).mul(tokenBPrice) : new Unit(0)), [tokenBPrice, amountTokenB]);
  const liquidity = useMemo(() => new Unit(tokenALiquidity).add(tokenBLiquidity), [tokenALiquidity, tokenBLiquidity]);

  const liquidityHex = useMemo(() => liquidity.toDecimalMinUnit(0), [liquidity]);
  const debouncedLiquidityHex = useDebounce(liquidityHex, 300);

  const [rewardsPerDay, setRewardsPerDay] = useState<{ tokenInfo: Token; rewardsPerDay: Unit }[] | undefined>(undefined);
  const [rewardsPerDayTotalPrice, setRewardsPerDayTotalPrice] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!account || !matchedPool?.incentiveKeys?.length || !amountTokenA.trim() || !amountTokenB.trim()) {
      setRewardsPerDay(undefined);
      setRewardsPerDayTotalPrice(undefined);
      return;
    }
    let canceled = false;

    const runGetRewardsPerDay = async () => {
      const estimateRewardRatesQueryMulticall = await fetchChain<string>({
        rpcUrl: import.meta.env.VITE_ESpaceRpcUrl,
        method: 'eth_call',
        params: [
          {
            from: '0x000000000000000000000000000000000000fe01',
            to: UniswapV3Staker.address,
            data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [
              matchedPool.incentiveKeys.map(({ key }) => UniswapV3Staker.func.interface.encodeFunctionData('estimateRewardRate', [key, account, debouncedLiquidityHex])),
            ]),
          },
          'latest',
        ],
      });
      if (canceled) return;
      const estimateRewardRatesQuery = UniswapV3Staker.func.interface.decodeFunctionResult('multicall', estimateRewardRatesQueryMulticall)?.[0];
      const estimateRewardRates = Array.from(estimateRewardRatesQuery).map((item) => {
        const result = UniswapV3Staker.func.interface.decodeFunctionResult('estimateRewardRate', item as string) as unknown as [bigint, bigint];
        return {
          boostedLiquidity: result[0],
          rewardsPerSecondX32: result[1],
        };
      });

      const rewardsPerDay = matchedPool.incentiveKeys.map(({ rewardTokenInfo }, index) => {
        const estimateRewardRate = estimateRewardRates[index];
        return {
          tokenInfo: getUnwrapperTokenByAddress(rewardTokenInfo?.address) ?? rewardTokenInfo,
          rewardsPerDay: new Unit(estimateRewardRate.rewardsPerSecondX32).div(new Unit(2 ** 32)).mul(86400),
        };
      });
      setRewardsPerDay(rewardsPerDay);
      getTokensPrice(rewardsPerDay.map(({ tokenInfo }) => tokenInfo.address)).then((prices) => {
        const _expectedRewardPerDayTotalPrice =
          rewardsPerDay?.reduce((acc, reward) => {
            const price = prices[reward.tokenInfo.address];
            if (!price) return acc;
            return acc.add(new Unit(price).mul(reward.rewardsPerDay).toDecimalStandardUnit(undefined, reward.tokenInfo.decimals));
          }, new Unit(0)) ?? new Unit(0);
        setRewardsPerDayTotalPrice(formatDisplayAmount(_expectedRewardPerDayTotalPrice, { decimals: 0, minNum: '0.00001', toFixed: 5, unit: '$' }));
      });
    };
    runGetRewardsPerDay();

    return () => {
      canceled = true;
    };
  }, [account, matchedPool, debouncedLiquidityHex]);

  if (!account || !matchedPool || !matchedPool.incentives?.length || rewardsPerDay === undefined) return null;
  return (
    <div className="mt-16px p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px font-medium">Expected Reward Per Day</span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap font-medium">
            {rewardsPerDayTotalPrice === undefined ? <Spin /> : rewardsPerDayTotalPrice ?? '-'}
          </span>
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-8px">
        {rewardsPerDay?.map(({ tokenInfo, rewardsPerDay }, index) => (
          <React.Fragment key={tokenInfo?.address}>
            {index > 0 && <span className="text-14px font-medium text-black-normal">+</span>}
            <TokenItem
              className="flex-row-reverse w-fit! gap-8px"
              key={tokenInfo?.address}
              token={tokenInfo}
              amount={formatDisplayAmount(rewardsPerDay, {
                decimals: tokenInfo?.decimals,
                minNum: '0.000001',
                toFixed: 2,
              })}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ExpectedReward;

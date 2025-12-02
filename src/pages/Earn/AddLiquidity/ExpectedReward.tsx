import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import Tooltip from '@components/Tooltip';
import Decimal from 'decimal.js';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { usePool } from '@service/pairs&pool';
import { usePools } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice, FeeAmount, calcLiquidityFromAmounts } from '@service/pairs&pool';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { type Token } from '@service/tokens';
import { formatDisplayAmount } from '@utils/numberUtils';
import { useAccount } from '@service/account';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';

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

const Zero = new Unit(0);

interface Props {
  tokenA: Token;
  tokenB: Token;
  amountTokenA: string;
  amountTokenB: string;
  priceInit: string;
  priceLower: string;
  priceUpper: string;
  fee: FeeAmount;
}

const ExpectedReward: React.FC<Props> = ({
  tokenA,
  tokenB,
  fee,
  amountTokenA: _amountTokenA,
  amountTokenB: _amountTokenB,
  priceInit: _priceInit,
  priceLower: __priceLower,
  priceUpper: __priceUpper,
}) => {
  const account = useAccount();
  const { pool } = usePool({ tokenA, tokenB, fee });
  const pools = usePools();
  const matchedPool = useMemo(() => pools?.find((p) => p.poolAddress.toLowerCase() === pool?.address?.toLowerCase()), [pools, pool?.address]);

  const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
  const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
  const priceInit = !_priceInit ? undefined : notNeedSwap ? new Decimal(_priceInit) : new Unit(1).div(_priceInit).toDecimal();

  const amountTokenA = !!_amountTokenA ? _amountTokenA : '0';
  const amountTokenB = !!_amountTokenB ? _amountTokenB : '0';
  const [_token0Amount, _token1Amount] = notNeedSwap ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA];
  const token0Amount = !!_token0Amount ? _token0Amount : '0';
  const token1Amount = !!_token1Amount ? _token1Amount : '0';

  const _priceLower = useMemo(() => {
    try {
      new Unit(__priceLower);
      return __priceLower;
    } catch {
      return '';
    }
  }, [__priceLower]);
  const _priceUpper = useMemo(() => {
    try {
      new Unit(__priceUpper);
      return __priceUpper;
    } catch {
      return '';
    }
  }, [__priceUpper]);
  const isPriceLowerZero = _priceLower !== '' && new Unit(_priceLower).equals(Zero);
  const isPriceUpperInfinity = _priceUpper === 'Infinity';

  const [priceLower, priceUpper] =
    _priceLower !== '' && _priceUpper !== ''
      ? notNeedSwap
        ? [new Unit(_priceLower), new Unit(_priceUpper)]
        : [isPriceUpperInfinity ? new Unit('0') : new Unit(1).div(_priceUpper), isPriceLowerZero ? new Unit('Infinity') : new Unit(1).div(_priceLower)]
      : [Zero, new Unit('Infinity')];

  let currentPrice = priceInit ? priceInit : pool?.token0Price ? pool.token0Price.toDecimalMinUnit() : new Decimal(token1Amount).div(new Decimal(token0Amount)).toString();
  currentPrice = new Unit(currentPrice).mul(`1e${token1.decimals - token0.decimals}`).toDecimalMinUnit();

  const token0AmountUnit = Unit.fromStandardUnit(token0Amount, token0.decimals);
  const token1AmountUnit = Unit.fromStandardUnit(token1Amount, token1.decimals);
  const liquidity = calcLiquidityFromAmounts({
    amount0: token0AmountUnit,
    amount1: token1AmountUnit,
    current: currentPrice,
    lower: priceLower,
    upper: priceUpper,
  }).toDecimalMinUnit(0);

  const liquidityHex = useMemo(() => new Unit(liquidity).toHexMinUnit(), [liquidity]);

  const debouncedLiquidityHex = useDebounce(liquidityHex, 300);

  const [rewardsPerDay, setRewardsPerDay] = useState<{ tokenInfo: Token; rewardsPerDay: Unit }[] | undefined>(undefined);
  const [rewardsPerDayTotalPrice, setRewardsPerDayTotalPrice] = useState<string | null | undefined>(undefined);

  const isAmountValid = useMemo(() => {
    return !!_amountTokenA.trim() && !!_amountTokenB.trim();
  }, [_amountTokenA, _amountTokenB]);

  useEffect(() => {
    if (!account || !matchedPool?.incentiveKeys?.length || !isAmountValid) {
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
        if (canceled) return;
        const _expectedRewardPerDayTotalPrice =
          rewardsPerDay?.reduce((acc, reward) => {
            const price = prices[reward.tokenInfo.address];
            if (!price) return acc;
            return acc.add(new Unit(price).mul(reward.rewardsPerDay).toDecimalStandardUnit(undefined, reward.tokenInfo.decimals));
          }, new Unit(0)) ?? new Unit(0);
        setRewardsPerDayTotalPrice(formatDisplayAmount(_expectedRewardPerDayTotalPrice, { decimals: 0, minNum: '0.01', toFixed: 2, unit: '$' }));
      });
    };
    runGetRewardsPerDay();

    return () => {
      canceled = true;
    };
  }, [account, matchedPool, debouncedLiquidityHex, isAmountValid]);

  if (!account || !matchedPool || !matchedPool.incentives?.length || !isAmountValid) return null;
  return (
    <div className="mt-16px p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-flex items-center mb-8px text-14px leading-18px font-medium">
            Expected Farming Rewards Per Day
            <Tooltip text="Estimated rewards distributed to you in this pool per day. Rewards are only earned when your position is in range.">
              <span className="w-12px h-12px ml-6px -translate-y-1px">
                <InfoIcon className="w-12px h-12px" />
              </span>
            </Tooltip>
          </span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap font-medium">
            {rewardsPerDayTotalPrice === undefined ? (
              <span className="inline-flex items-center gap-4px">
                <span >$</span>
                <Spin />
              </span>
            ) : (
              rewardsPerDayTotalPrice ?? '-'
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-8px">
        {!rewardsPerDay?.length && <Spin className="text-24px text-black-normal" />}
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
                toFixed: 6,
              })}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ExpectedRewardWrapper: React.FC<Props> = (props) => {
  return (
    <Suspense fallback={null}>
      <ExpectedReward {...props} />
    </Suspense>
  );
};

export default ExpectedRewardWrapper;

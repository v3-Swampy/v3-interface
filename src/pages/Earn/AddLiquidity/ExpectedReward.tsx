import React, { useState, useMemo, useEffect } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import { fetchMulticall, UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { usePool } from '@service/pairs&pool';
import { usePools } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice, FeeAmount } from '@service/pairs&pool';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { type Token } from '@service/tokens';
import { formatDisplayAmount } from '@utils/numberUtils';
import { useAccount } from '@service/account';

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

  // const unclaimedRewardsInfo = useMemo(
  //   () =>
  //     position?.unclaimedRewards?.map((reward) => {
  //       return {
  //         token: getUnwrapperTokenByAddress(reward.rewardTokenInfo?.address) ?? reward.rewardTokenInfo,
  //         unclaimedReward: new Unit(reward.stakeReward.unclaimedReward),
  //       };
  //     }) ?? [],
  //   [position?.unclaimedRewards]
  // );

  // const [unsettledRewardsTotalPrice, setUnsettledRewardsTotalPrice] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!account || !matchedPool?.incentiveKeys?.length || !amountTokenA.trim() || !amountTokenB.trim()) return;

    const runFetch = async () => {
      console.log('matchedPool.incentiveKeys[0].key', [matchedPool.incentiveKeys[0].key, account, Unit.fromStandardUnit(amountTokenA, tokenA.decimals).toHexMinUnit()]);
      const incentiveKeysQuery1 = await fetchChain({
        params: [
          {
            from: '0x000000000000000000000000000000000000fe01',
            to: UniswapV3Staker.address,
            data: UniswapV3Staker.func.interface.encodeFunctionData('estimateRewardRate', [matchedPool.incentiveKeys[0].key, account, Unit.fromStandardUnit(amountTokenA, tokenA.decimals).toHexMinUnit()]),
          },
          'latest',
        ],
      }).then(res => {
        console.log('res', res);
        return res;
      }).catch(err => {
        console.log('err', err);
        return null;
      });

      // const incentiveKeysQuery = await fetchMulticall(
      //   matchedPool.incentiveKeys.map((incentiveKey) => [
      //     UniswapV3Staker.address,
      //     UniswapV3Staker.func.interface.encodeFunctionData('estimateRewardRate', [incentiveKey.key, account, Unit.fromStandardUnit(amountTokenA, tokenA.decimals).toHexMinUnit()]),
      //   ])
      // );
    };
    runFetch();
  }, [account, matchedPool, amountTokenA, amountTokenB]);

  if (!matchedPool || !matchedPool.incentives?.length) return null;
  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-b-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">Expected Reward Per Day</span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap font-medium">
            {/* {unsettledRewardsTotalPrice === undefined ? <Spin /> : unsettledRewardsTotalPrice ?? '-'} */}$ 1.25000
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-8px w-full">
        {/* {unclaimedRewardsInfo.map(({ token, unclaimedReward }) => (
          <TokenItem
            key={token?.address}
            token={token}
            amount={formatDisplayAmount(unclaimedReward, {
              decimals: token?.decimals,
              minNum: '0.000001',
              toFixed: 6,
            })}
          />
        ))} */}
      </div>
    </div>
  );
};

export default ExpectedReward;

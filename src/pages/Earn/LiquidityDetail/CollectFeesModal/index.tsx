import React, { useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import AuthConnectButton from '@modules/AuthConnectButton';
import Button from '@components/Button';
import useInTransaction from '@hooks/useInTransaction';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { type PositionEnhanced, handleCollectFees as _handleCollectFees, useRefreshPositionFees, MergedRewardInfo } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { formatDisplayAmount } from '@utils/numberUtils';

const transitions = {
  en: {
    title: 'Claim Fees & Rewards',
    collect: 'Collect',
    collect_tip: 'Collecting will withdraw all your available fees and rewards.',
  },
  zh: {
    title: '提取收益和奖励',
    collect: '提取',
    collect_tip: '提取将提取您所有可用的费用和奖励。',
  },
} as const;

interface CommonProps {
  fee0?: Unit;
  fee1?: Unit;
  position: PositionEnhanced | undefined;
  tokenId?: number;
  unsettledRewardsTotalPrice: Unit | null | undefined;
}

type Props = ConfirmModalInnerProps & CommonProps;

const CollectFeesModal: React.FC<Props> = ({ setNextInfo, fee0, fee1, position, tokenId, unsettledRewardsTotalPrice }) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: handleCollectFees } = useInTransaction(_handleCollectFees);
  const { token0, token1 } = position || {};
  const refreshPositionFees = useRefreshPositionFees(tokenId);

  const activeRewardsInfo = useMemo(
    () =>
      position?.activeRewards?.map((reward) => {
        return {
          token: getUnwrapperTokenByAddress(reward.rewardTokenInfo.address) ?? reward.rewardTokenInfo,
          unsettledReward: new Unit(reward.stakeReward.unsettledReward),
        };
      }) ?? [],
    [position?.activeRewards]
  );

  const feesInfo = useMemo(() => {
    const fees = [];
    if (token0 && fee0) {
      fees.push({ token: getUnwrapperTokenByAddress(token0.address) ?? token0, fee: fee0 });
    }
    if (token1 && fee1) {
      fees.push({ token: getUnwrapperTokenByAddress(token1.address) ?? token1, fee: fee1 });
    }
    return fees;
  }, [token0, token1, fee0, fee1]);

  // 合并 feesInfo 和 activeRewardsInfo，相同 token 的 amount 相加
  const mergedRewardsInfo: MergedRewardInfo[] = useMemo(() => {
    const mergedMap = new Map<string, MergedRewardInfo>();

    // 先添加 fees
    feesInfo.forEach(({ token, fee }) => {
      if (token && fee) {
        mergedMap.set(token.address.toLowerCase(), {
          token,
          amount: fee,
        });
      }
    });

    // 再添加 activeRewards，如果有相同 token 则相加
    activeRewardsInfo.forEach(({ token, unsettledReward }) => {
      if (token && unsettledReward) {
        const key = token.address.toLowerCase();
        const existing = mergedMap.get(key);

        if (existing) {
          // 相同 token，amount 相加
          mergedMap.set(key, {
            token,
            amount: unsettledReward.add(existing.amount),
          });
        } else {
          // 不同 token，直接添加
          mergedMap.set(key, {
            token,
            amount: unsettledReward,
          });
        }
      }
    });

    return Array.from(mergedMap.values());
  }, [feesInfo, activeRewardsInfo]);

  const onSubmit = useCallback(async () => {
    if (!tokenId || !token0 || !token1 || !fee0 || !fee1 || (fee0.equals(0) && fee1.equals(0) && unsettledRewardsTotalPrice?.equals(0))) return;
    setNextInfo({
      sendTransaction: () => handleCollectFees({ tokenId, refreshPositionFees, mergedRewardsInfo }),
    });
  }, [refreshPositionFees]);

  return (
    <div className="mt-24px flex flex-col h-full flex-grow-1">
      <div className="flex flex-col gap-8px p-16px bg-orange-light-hover rounded-20px mb-16px">
        {mergedRewardsInfo.map(({ token, amount }) => (
          <TokenItem
            key={token.address}
            token={token}
            amount={formatDisplayAmount(amount, {
              decimals: token.decimals,
              minNum: '0.000001',
              toFixed: 6,
            })}
          />
        ))}
      </div>
      <p className="text-black-normal text-14px leading-18px mb-8px pl-8px">{i18n.collect_tip}</p>
      <AuthConnectButton {...buttonProps}>
        <Button {...buttonProps} loading={inTransaction} onClick={onSubmit}>
          {i18n.collect}
        </Button>
      </AuthConnectButton>
    </div>
  );
};

const buttonProps = {
  color: 'orange',
  fullWidth: true,
  className: 'mt-auto h-48px rounded-100px text-16px font-medium',
} as const;

const showCollectFeesModal = (props: CommonProps) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <CollectFeesModal {...props} {...confirmModalInnerProps} />,
    className: '!max-w-572px !min-h-388px !flex !flex-col',
  });
};

export default showCollectFeesModal;

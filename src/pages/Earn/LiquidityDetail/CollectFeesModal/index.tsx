import React, { useCallback } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import AuthConnectButton from '@modules/AuthConnectButton';
import Button from '@components/Button';
import useInTransaction from '@hooks/useInTransaction';
import { type PositionForUI } from '@service/earn';
import TokenPairAmount from '@modules/Position/TokenPairAmount';
import { handleCollectFees as _handleCollectFees, useRefreshPositionFees } from '@service/earn';

const transitions = {
  en: {
    title: 'Claim fees',
    collect: 'Collect',
    collect_tip: 'Collecting fees will withdraw currently available fees for you.',
  },
  zh: {
    title: '提取收益',
    collect: '提取',
    collect_tip: 'Collecting fees will withdraw currently available fees for you.',
  },
} as const;

interface CommonProps {
  fee0?: Unit;
  fee1?: Unit;
  position: PositionForUI | undefined;
  tokenId?: number;
}
type Props = ConfirmModalInnerProps & CommonProps;

const CollectFeesModal: React.FC<Props> = ({ setNextInfo, fee0, fee1, position, tokenId }) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: handleCollectFees } = useInTransaction(_handleCollectFees);
  const { token0, token1 } = position || {};
  const refreshPositionFees = useRefreshPositionFees(tokenId);

  const onSubmit = useCallback(async () => {
    if (!tokenId || !token0 || !token1 || !fee0 || !fee1 || (fee0.equals(0) && fee1.equals(0))) return;
    setNextInfo({
      sendTransaction: () => handleCollectFees({ tokenId, refreshPositionFees }),
    });
  }, [refreshPositionFees]);

  return (
    <div className="mt-24px flex flex-col h-full flex-grow-1">
      <div className="flex p-16px bg-orange-light-hover rounded-20px mb-16px">
        <TokenPairAmount amount0={new Unit(fee0 ?? 0)} amount1={new Unit(fee1 ?? 0)} position={position} />
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

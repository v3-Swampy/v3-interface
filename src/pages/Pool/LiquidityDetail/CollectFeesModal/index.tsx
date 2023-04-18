import React, { useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import AuthConnectButton from '@modules/AuthConnectButton';
import Button from '@components/Button';
import useInTransaction from '@hooks/useInTransaction';
import { type PositionForUI } from '@service/position';
import TokenPairAmount from '@modules/Position/TokenPairAmount';
import { handleCollectFees } from '@service/position';

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
  const { inTransaction, execTransaction: handleStakingVST } = useInTransaction(handleCollectFees);

  return (
    <div className="mt-24px">
      <div className="flex p-16px bg-orange-light-hover rounded-20px mb-16px">
        <TokenPairAmount amount0={new Unit(fee0 ?? 0)} amount1={new Unit(fee1 ?? 0)} position={position} tokenId={tokenId} />
      </div>
      <p className="text-black-normal text-14px leading-18px mb-8px pl-8px">{i18n.collect_tip}</p>
      <AuthConnectButton {...buttonProps}>
        <Button {...buttonProps} loading={inTransaction}>
          {i18n.collect}
        </Button>
      </AuthConnectButton>
    </div>
  );
};

const buttonProps = {
  color: 'orange',
  fullWidth: true,
  className: 'mt-24px h-48px rounded-100px text-16px font-bold',
} as const;

const showCollectFeesModal = (props: CommonProps) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <CollectFeesModal {...props} {...confirmModalInnerProps} />,
    className: '!max-w-572px',
  });
};

export default showCollectFeesModal;

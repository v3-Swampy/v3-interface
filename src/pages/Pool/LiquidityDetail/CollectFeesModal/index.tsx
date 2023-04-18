import React, { useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import AuthConnectButton from '@modules/AuthConnectButton';
import Button from '@components/Button';
import useInTransaction from '@hooks/useInTransaction';
import { type PositionForUI } from '@service/position';
import TokenPairAmount from '@modules/Position/TokenPairAmount';
import { handleCollectFees as _handleCollectFees } from '@service/position';

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

  const onSubmit = useCallback(async () => {
    try {
      if (!tokenId || !token0 || !token1 || !fee0 || !fee1 || (fee0 === new Unit(0) && fee1 === new Unit(0))) return;
      const txHash = await handleCollectFees(tokenId);

      setNextInfo({
        txHash,
        recordParams: {
          type: 'Position_CollectFees',
          tokenA_Address: token0.address,
          tokenA_Value: fee0 ? new Unit(fee0)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
          tokenB_Address: token1.address,
          tokenB_Value: fee1 ? new Unit(fee1)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
        },
      });
    } catch (err) {
      console.error('Collect fees failed: ', err);
    }
  }, []);

  return (
    <div className="mt-24px">
      <form onSubmit={onSubmit}>
        <div className="flex p-16px bg-orange-light-hover rounded-20px mb-16px">
          <TokenPairAmount amount0={new Unit(fee0 ?? 0)} amount1={new Unit(fee1 ?? 0)} position={position} tokenId={tokenId} />
        </div>
        <p className="text-black-normal text-14px leading-18px mb-8px pl-8px">{i18n.collect_tip}</p>
        <AuthConnectButton {...buttonProps}>
          <Button {...buttonProps} loading={inTransaction} onClick={onSubmit}>
            {i18n.collect}
          </Button>
        </AuthConnectButton>
      </form>
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

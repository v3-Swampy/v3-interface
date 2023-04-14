import React, { useCallback, Suspense } from 'react';
import { type Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n } from '@hooks/useI18n';
import Button from '@components/Button';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import TokenPair from '@modules/Position/TokenPair';
import Status from '@modules/Position/PositionStatus';
import TokenPairAmount from '@modules/Position/TokenPairAmount';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import { type PositionForUI } from '@service/position';
import { type Token } from '@service/tokens';
import { handleCreatePosition as _handleCreatePosition } from '@service/position';
import useInTranscation from '@hooks/useInTranscation';

const transitions = {
  en: {
    title: 'Add Liquidity',
    confirm: 'Confirm',
  },
  zh: {
    title: '添加流动性',
    confirm: '确认',
  },
} as const;

interface Props {
  leftToken: Token;
  rightToken: Token;
  inverted: boolean;
  amount0: Unit;
  amount1: Unit;
  previewPosition: PositionForUI;
  previewUniqueId: string;
  transcationParams: {
    to: string;
    data: string;
    value: string;
  };
  recordParams: {
    tokenA_Address: string;
    tokenA_Value: string;
    tokenB_Address: string;
    tokenB_Value: string;
  };
}

const AddLiquidityModal: React.FC<ConfirmModalInnerProps & Props> = ({
  setNextInfo,
  inverted,
  amount0,
  amount1,
  previewUniqueId,
  previewPosition,
  leftToken,
  rightToken,
  transcationParams,
  recordParams,
}) => {
  const i18n = useI18n(transitions);
  const { inTranscation, execTranscation: handleCreatePosition } = useInTranscation(_handleCreatePosition);
  const handleClickConfirm = useCallback(async () => {
    try {
      const txHash = await handleCreatePosition({
        transcationParams,
        recordParams,
      });

      setNextInfo({ txHash, action: `add liquidity` });
    } catch (err) {
      console.error('Add liquidity transcation failed: ', err);
    }
  }, []);

  return (
    <div className="mt-24px">
      <Suspense fallback={'...'}>
        <div className="flex justify-between items-center">
          <TokenPair position={previewPosition} showFee={false} inverted={!inverted} leftToken={leftToken} rightToken={rightToken} />
          <Status position={previewPosition} />
        </div>
        <TokenPairAmount amount0={amount0} amount1={amount1} position={previewPosition} tokenId={previewUniqueId} leftToken={leftToken} rightToken={rightToken} />
        <SelectedPriceRange position={previewPosition} tokenId={previewUniqueId} showInvertButton={false} leftToken={rightToken} rightToken={leftToken} />
        <Button color="gradient" fullWidth className="mt-26px h-36px rounded-10px text-14px" loading={inTranscation} onClick={handleClickConfirm}>
          {i18n.confirm}
        </Button>
      </Suspense>
    </div>
  );
};

const showAddLiquidityModal = (props: Props) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <AddLiquidityModal {...confirmModalInnerProps} {...props} />,
    className: '!max-w-458px !min-h-596px',
  });
};

export default showAddLiquidityModal;

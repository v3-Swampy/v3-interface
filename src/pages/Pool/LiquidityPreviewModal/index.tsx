import React, { useCallback, Suspense } from 'react';
import cx from 'clsx';
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
import { handleCreatePosition as _handleCreatePosition, handleIncreasePositionLiquidity as _handleIncreasePositionLiquidity } from '@service/position';
import useInTransaction from '@hooks/useInTransaction';
import { isMobile } from '@utils/is';

const transitions = {
  en: {
    create_title: 'Add Liquidity',
    increase_title: 'Increase Liquidity',
    add: 'Add',
    increase: 'Increase',
  },
  zh: {
    create_title: '新添流动性',
    increase_title: 'Increase Liquidity',
    add: '新添',
    increase: '增加',
  },
} as const;

interface Props {
  leftToken: Token;
  rightToken: Token;
  leftAmount: Unit;
  rightAmount: Unit;
  priceInit?: string;
  previewPosition: PositionForUI;
  previewUniqueId: string;
  transactionParams: {
    to: string;
    data: string;
    value: string;
  };
  recordParams: {
    type: 'Position_AddLiquidity' | 'Position_IncreaseLiquidity';
    tokenA_Address: string;
    tokenA_Value: string;
    tokenB_Address: string;
    tokenB_Value: string;
  };
}

const LiquidityPreviewModal: React.FC<ConfirmModalInnerProps & Props> = ({
  setNextInfo,
  leftAmount,
  rightAmount,
  priceInit,
  previewUniqueId,
  previewPosition,
  leftToken,
  rightToken,
  transactionParams,
  recordParams,
}) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction } = useInTransaction(recordParams?.type === 'Position_AddLiquidity' ? _handleCreatePosition : _handleIncreasePositionLiquidity);
  const handleClickConfirm = useCallback(async () => {
    setNextInfo({ sendTransaction: () => execTransaction(transactionParams), recordParams });
  }, []);

  return (
    <div className={cx(isMobile ? 'mt-12px max-h-[calc(100vh-150px)] overflow-scroll drawer-inner-scroller' : 'mt-24px')}>
      <Suspense fallback={'...'}>
        <div className="flex justify-between items-center">
          <TokenPair className="!text-18px" position={previewPosition} showFee={false} leftToken={leftToken} rightToken={rightToken} />
          <Status position={previewPosition} />
        </div>

        <div className="mt-24px mb-18px p-16px rounded-20px bg-orange-light-hover">
          <TokenPairAmount leftAmount={leftAmount} rightAmount={rightAmount} position={previewPosition} tokenId={previewUniqueId} leftToken={leftToken} rightToken={rightToken} />
          <p className="mt-18px flex justify-between leading-18px pl-32px text-14px text-black-normal font-normal">
            Fee Tier
            <span>{previewPosition.fee / 10000}%</span>
          </p>
        </div>

        <SelectedPriceRange position={previewPosition} tokenId={previewUniqueId} showInvertButton={false} leftToken={leftToken} rightToken={rightToken} priceInit={priceInit} />
        <Button color="orange" fullWidth className="mt-16px h-40px rounded-100px text-18px" loading={inTransaction} onClick={handleClickConfirm} id="pool-liquidity-preview-modal-submit-button">
          {i18n.add}
        </Button>
      </Suspense>
    </div>
  );
};

const showLiquidityPreviewModal = (props: Props) => {
  showConfirmTransactionModal({
    title: toI18n(transitions)[props.recordParams.type === 'Position_AddLiquidity' ? 'create_title' : 'increase_title'],
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <LiquidityPreviewModal {...confirmModalInnerProps} {...props} />,
    className: '!max-w-458px !min-h-596px',
    onSuccess: (navigate) => navigate('/pool'),
    height: 'full',
  });
};

export default showLiquidityPreviewModal;

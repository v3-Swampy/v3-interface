import React, { useCallback } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n } from '@hooks/useI18n';
import Button from '@components/Button';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { type Token } from '@service/tokens';
import { handleSwap as _handleSwap } from '@service/swap';
import { type useBestTrade } from '@service/pairs&pool';
import useInTransaction from '@hooks/useInTransaction';
import SwapDetail from '@pages/Swap/SwapDetail';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as ExchangeIcon } from '@assets/icons/exchange_gray.svg';

const transitions = {
  en: {
    confirm_swap: 'Confirm Swap',
  },
  zh: {
    confirm_swap: 'Confirm Swap',
  },
} as const;

interface Props {
  sourceToken: Token;
  destinationToken: Token;
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  sourceTokenUSDPrice: string | null | undefined;
  destinationTokenUSDPrice: string | null | undefined;
  bestTrade: ReturnType<typeof useBestTrade>;
  transactionParams: {
    to: string;
    data: string;
    value: string;
  };
  recordParams: {
    type: 'Swap';
    tokenA_Address: string;
    tokenA_Value: string;
    tokenB_Address: string;
    tokenB_Value: string;
  };
  onSuccess: VoidFunction;
}

const SwapConfirmModal: React.FC<ConfirmModalInnerProps & Props> = ({
  sourceTokenAmount,
  destinationTokenAmount,
  sourceToken,
  destinationToken,
  sourceTokenUSDPrice,
  destinationTokenUSDPrice,
  bestTrade,
  setNextInfo,
  transactionParams,
  recordParams,
}) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: handleSwap } = useInTransaction(_handleSwap);
  const handleClickConfirm = useCallback(async () => {
    setNextInfo({ sendTranscation: () => handleSwap(transactionParams), recordParams });
  }, []);

  return (
    <div className="mt-24px h-full flex-grow-1 flex flex-col">
      <div className="flex justify-between items-center h-72px px-24px rounded-20px bg-orange-light-hover">
        <span className="text-32px font-medium">{sourceTokenAmount}</span>
        <div className={'flex-shrink-0 ml-14px flex items-center text-14px text-black-normal font-medium'}>
          {<img className="w-24px h-24px mr-4px" src={sourceToken.logoURI} alt={`${sourceToken.symbol} logo`} />}
          {sourceToken.symbol}
        </div>
      </div>
      <div className="mx-auto -my-21.5px w-fit h-fit p-4px bg-white-normal rounded-full translate-y-0">
        <div className="w-40px h-40px flex justify-center items-center rounded-full bg-orange-light-hover">
          <ExchangeIcon className="w-26px h-26px" />
        </div>
      </div>
      <div className="flex justify-between items-center h-72px px-24px rounded-20px bg-orange-light-hover">
        <span className="text-32px font-medium">{destinationTokenAmount}</span>
        <div className={'flex-shrink-0 ml-14px flex items-center text-14px text-black-normal font-medium'}>
          {<img className="w-24px h-24px mr-4px" src={destinationToken.logoURI} alt={`${destinationToken.symbol} logo`} />}
          {destinationToken.symbol}
        </div>
      </div>

      <SwapDetail
        bestTrade={bestTrade}
        sourceTokenUSDPrice={sourceTokenUSDPrice} destinationTokenUSDPrice={destinationTokenUSDPrice} sourceTokenAmount={sourceTokenAmount} destinationTokenAmount={destinationTokenAmount} fromPreview />

      <p className="my-16px px-24px text-14px leading-18px text-gray-normal font-medium">
        Input is estimated. You will sell at most
        <span className="mx-6px text-black-normal">
          {trimDecimalZeros(Unit.fromStandardUnit(sourceTokenAmount).toDecimalStandardUnit(5))} {sourceToken.symbol}
        </span>
        or the transaction will revert.
      </p>

      <Button color="orange" fullWidth className="mt-auto h-48px rounded-100px text-14px" loading={inTransaction} onClick={handleClickConfirm}>
        {i18n.confirm_swap}
      </Button>
    </div>
  );
};

const showSwapConfirmModal = (props: Props) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).confirm_swap,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <SwapConfirmModal {...confirmModalInnerProps} {...props} />,
    tokenNeededAdd: props?.destinationToken,
    className: '!max-w-572px !min-h-540px flex flex-col',
    onSuccess: props.onSuccess
  });
};

export default showSwapConfirmModal;

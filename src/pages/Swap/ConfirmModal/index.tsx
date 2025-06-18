import React, { useCallback, useEffect, useState, useMemo } from 'react';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { toI18n } from '@hooks/useI18n';
import Button from '@components/Button';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { type Token } from '@service/tokens';
import { fetchBestTrade, setBestTradeState, TradeType, type useBestTrade } from '@service/pairs&pool';
import { handleSwap as _handleSwap } from '@service/swap';
import useInTransaction from '@hooks/useInTransaction';
import SwapDetail from '@pages/Swap/SwapDetail';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as ExchangeIcon } from '@assets/icons/exchange_gray.svg';
import { waitSeconds } from '@utils/waitAsyncResult';
import { ReactComponent as WarningIcon } from '@assets/icons/warning_small.svg';
import { isMobile } from '@utils/is';

const transitions = {
  en: {
    confirm_swap: 'Confirm Swap',
  },
  zh: {
    confirm_swap: 'Confirm Swap',
  },
} as const;

interface Props {
  currentTradeType: TradeType | null;
  inputedAmount: string;
  sourceToken: Token;
  destinationToken: Token;
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  sourceTokenUSDPrice: string | null | undefined;
  destinationTokenUSDPrice: string | null | undefined;
  bestTrade: ReturnType<typeof useBestTrade>;
  onSuccess: VoidFunction;
}

const SwapConfirmModal: React.FC<ConfirmModalInnerProps & Props> = ({
  currentTradeType,
  inputedAmount,
  sourceToken,
  destinationToken,
  sourceTokenUSDPrice,
  destinationTokenUSDPrice,
  bestTrade,
  setNextInfo,
  onSuccess,
}) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: handleSwap } = useInTransaction(_handleSwap);

  const [currentBestTrade, setCurrentBestTrade] = useState(() => bestTrade!);
  const [updateTradeFunc, setUpdateTradeFunc] = useState<VoidFunction | null>(null);
  const { sourceTokenAmount, destinationTokenAmount } = useMemo(() => {
    const sourceTokenAmount = currentBestTrade.trade!.amountIn.toDecimalStandardUnit(undefined, sourceToken?.decimals);
    const destinationTokenAmount = currentBestTrade.trade!.amountOut?.toDecimalStandardUnit(undefined, destinationToken?.decimals);
    return { sourceTokenAmount, destinationTokenAmount };
  }, [currentBestTrade]);

  useEffect(() => {
    let inPolling = true;
    const pollingFetchBestTrade = async () => {
      while (inPolling) {
        try {
          await waitSeconds(10);
          const res = await fetchBestTrade({ tradeType: currentTradeType, amount: inputedAmount, tokenIn: sourceToken, tokenOut: destinationToken });
          if (!inPolling) {
            return;
          }
          if (res.trade) {
            if (!(res.trade.amountIn.equals(currentBestTrade.trade!.amountIn) && res.trade.amountOut.equals(currentBestTrade.trade!.amountOut))) {
              setUpdateTradeFunc(() => () => {
                setCurrentBestTrade(res);
                setBestTradeState({ tradeType: currentTradeType, amount: inputedAmount, tokenIn: sourceToken, tokenOut: destinationToken }, res);
                setUpdateTradeFunc(null);
              });
            } else {
              setUpdateTradeFunc(null);
            }
          }
        } catch (_) {}
      }
    };
    pollingFetchBestTrade();
    return () => {
      inPolling = false;
    };
  }, [currentBestTrade]);

  const handleClickConfirm = useCallback(async () => {
    setNextInfo({
      sendTransaction: () =>
        handleSwap({
          sourceTokenAmount,
          destinationTokenAmount,
          bestTrade: currentBestTrade,
          onSuccess,
        }),
    });
  }, [sourceTokenAmount, destinationTokenAmount, currentBestTrade]);

  return (
    <div className="mt-24px h-full flex-grow-1 flex flex-col">
      <div className="flex justify-between items-center h-72px lt-mobile:h-64px px-24px lt-mobile:px-16px rounded-20px bg-orange-light-hover">
        <span className="text-32px lt-mobile:text-24px font-normal lt-mobile:max-w-[calc(100%-80px)] text-ellipsis overflow-hidden">{sourceTokenAmount}</span>
        <div className={'flex-shrink-0 ml-14px flex items-center text-14px text-black-normal font-normal'}>
          {<img className="w-24px h-24px mr-4px" src={sourceToken.logoURI} alt={`${sourceToken.symbol} logo`} />}
          {sourceToken.symbol}
        </div>
      </div>
      <div className="mx-auto -my-21.5px lt-mobile:-my-17.5px w-fit h-fit p-4px bg-white-normal rounded-full translate-y-0">
        <div className="w-40px h-40px lt-mobile:w-32px lt-mobile:h-32px flex justify-center items-center rounded-full bg-orange-light-hover">
          <ExchangeIcon className="w-26px h-26px lt-mobile:w-20px lt-mobile:h-20px" />
        </div>
      </div>
      <div className="flex justify-between items-center h-72px lt-mobile:h-64px px-24px lt-mobile:px-16px rounded-20px bg-orange-light-hover">
        <span className="text-32px lt-mobile:text-24px font-normal lt-mobile:max-w-[calc(100%-80px)] text-ellipsis overflow-hidden">{destinationTokenAmount}</span>
        <div className={'flex-shrink-0 ml-14px flex items-center text-14px text-black-normal font-normal'}>
          {<img className="w-24px h-24px mr-4px" src={destinationToken.logoURI} alt={`${destinationToken.symbol} logo`} />}
          {destinationToken.symbol}
        </div>
      </div>

      <SwapDetail
        bestTrade={currentBestTrade}
        sourceTokenUSDPrice={sourceTokenUSDPrice}
        destinationTokenUSDPrice={destinationTokenUSDPrice}
        sourceTokenAmount={sourceTokenAmount}
        destinationTokenAmount={destinationTokenAmount}
        fromPreview
      />

      {updateTradeFunc === null && (
        <p className={cx('px-24px text-14px leading-18px text-gray-normal font-normal', isMobile ? 'mt-80px' : 'my-16px')}>
          Input is estimated. You will sell at most
          <span className="mx-6px text-black-normal">
            {trimDecimalZeros(Unit.fromStandardUnit(sourceTokenAmount).toDecimalStandardUnit(5))} {sourceToken.symbol}
          </span>
          or the transaction will revert.
        </p>
      )}

      {updateTradeFunc !== null && (
        <div className={cx('px-24px flex items-center h-40px rounded-8px bg-orange-light text-18px text-orange-normal font-normal', isMobile ? 'mt-76px' : 'mt-12px mb-16px')}>
          <WarningIcon className="w-24px h-24px mr-12px" />
          Price Updated
          <Button className="ml-auto px-12px h-26px rounded-4px" onClick={updateTradeFunc}>
            Accept
          </Button>
        </div>
      )}

      <Button
        color="orange"
        fullWidth
        className={cx('h-40px text-18px rounded-100px', isMobile ? 'mt-16px' : 'mt-auto')}
        loading={inTransaction}
        onClick={handleClickConfirm}
        disabled={updateTradeFunc !== null}
      >
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
    onSuccess: props.onSuccess,
    height: 'full',
  });
};

export default showSwapConfirmModal;

import React, { useState, useCallback, type ReactNode, useEffect } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { isMobile } from '@utils/is';
import { watchAsset } from '@service/account';
import { type Token } from '@service/tokens';
import { addRecordToHistory, type HistoryRecord } from '@service/history';
import { RecordAction } from '@modules/Navbar/AccountDetailDropdown/History';
import { ReactComponent as SuccessIcon } from '@assets/icons/success.svg';
import { ReactComponent as FailedIcon } from '@assets/icons/failed.svg';
import showGasLimitModal from './showGasLimitModal';

export enum Step {
  Confirm = 0,
  WaitReceipt,
  Success,
  Rejected,
  Failed,
}

interface CommonProps {
  className?: string;
  initialStep?: Step;
  tokenNeededAdd?: Token;
  ConfirmContent?: any;
  onSuccess?: (navigate: NavigateFunction) => void;
}

export interface ConfirmModalInnerProps {
  setNextInfo: (info: { sendTransaction: () => Promise<string>; recordParams?: Omit<HistoryRecord, 'txHash' | 'status'>; thenFunc?: () => void }) => void;
}

const ConfirmTransactionModal: React.FC<CommonProps & { children?: ReactNode | (() => ReactNode) }> = ({
  initialStep = Step.Confirm,
  ConfirmContent,
  tokenNeededAdd,
  onSuccess,
}) => {
  const [step, setStep] = useState(() => initialStep);
  const [txHash, setTxHash] = useState('');
  const [recordParams, setRecordParams] = useState<Omit<HistoryRecord, 'txHash' | 'status'> | null>(null);

  const setNextInfo = useCallback(
    async ({
      sendTransaction,
      recordParams,
      thenFunc,
    }: {
      sendTransaction: () => Promise<string>;
      recordParams?: Omit<HistoryRecord, 'txHash' | 'status'>;
      thenFunc?: () => void;
    }) => {
      try {
        setStep(Step.WaitReceipt);
        const txHash = await sendTransaction();
        if (recordParams) {
          setRecordParams(recordParams);
          addRecordToHistory(
            {
              txHash,
              ...recordParams,
            },
            thenFunc
          );
        }
        setTxHash(txHash);
        setStep(Step.Success);
      } catch (err: any) {
        if (err?.code === -32603) {
          hidePopup();
          setTimeout(() => {
            showGasLimitModal();
          }, 400);
        } else {
          setStep(Step.Failed);
        }
      }
    },
    []
  );

  const navigate = useNavigate();
  useEffect(() => {
    if (step === Step.Success && onSuccess) {
      onSuccess?.((...params) => {
        navigate(params?.[0] as any, params?.[1] as any);
        setTimeout(() => {
          history.replaceState(null, '', '');
          history.pushState(null, '', '#modal');
        }, 16);
      });
    }
  }, [step]);

  if (step === Step.Confirm) {
    return <ConfirmContent setNextInfo={setNextInfo} />;
  }

  if (step === Step.WaitReceipt) {
    return (
      <div className="absolute left-0 w-full top-1/2 lt-mobile:top-[calc(50%-60px)] -translate-y-1/2 text-center whitespace-nowrap">
        <Spin className="mb-40px mx-auto block text-88px text-black-normal" />
        <p className="leading-28px text-center text-22px text-black-normal">Waiting for confirmation</p>
        {recordParams && (
          <p className="px-36px leading-28px text-center text-22px text-black-normal">
            <RecordAction className="text-22px text-black-normal" {...recordParams} />
          </p>
        )}
        <p className="mt-16px text-center leading-18px text-14px text-gray-normal font-normal">Confirm this transaction in your wallet</p>
      </div>
    );
  }

  if (step === Step.Success) {
    return (
      <>
        <div className="absolute left-0 w-full top-[calc(50%-12px)] lt-mobile:top-[calc(50%-60px)] -translate-y-1/2 text-center whitespace-nowrap">
          <SuccessIcon className="mx-auto block w-92px h-70px mb-24px" />
          <p className="leading-28px text-22px text-black-normal">Transaction submitted</p>
          {tokenNeededAdd && (
            <div
              className="mt-8px mx-auto w-fit px-24px h-40px leading-40px rounded-100px bg-orange-light-hover text-center text-14px text-black-normal font-normal cursor-pointer"
              onClick={() =>
                watchAsset({
                  type: 'ERC20',
                  options: {
                    address: tokenNeededAdd.address,
                    symbol: tokenNeededAdd.symbol,
                    decimals: tokenNeededAdd.decimals,
                    image: tokenNeededAdd.fromSearch ? "https://conflux-static.oss-cn-beijing.aliyuncs.com/icons/default.png" : tokenNeededAdd.logoURI ?? "https://conflux-static.oss-cn-beijing.aliyuncs.com/icons/default.png",
                  },
                })
              }
            >
              Add {tokenNeededAdd.symbol}
            </div>
          )}
        </div>
        <a
          href={`${import.meta.env.VITE_ESpaceScanUrl}/tx/${txHash}`}
          className="absolute left-16px bottom-80px right-16px leading-18px text-center text-14px text-orange-normal font-normal"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Block Explorer
        </a>
        {!isMobile && (
          <Button color="orange" className="absolute left-16px bottom-24px right-16px h-48px rounded-100px text-16px !font-medium" onClick={hidePopup}>
            Close
          </Button>
        )}
      </>
    );
  }

  if (step === Step.Failed) {
    return (
      <>
        <div className="absolute left-0 w-full top-1/2 lt-mobile:top-[calc(50%-60px)] -translate-y-1/2 text-center whitespace-nowrap">
          <FailedIcon className="mx-auto block w-70px h-70px mb-32px" />
          <p className="leading-28px text-22px text-black-normal">Transaction Rejected</p>
          <p className="mt-16px text-center leading-18px text-14px text-gray-normal font-normal opacity-0 pointer-events-none">placeHolder</p>
        </div>
        {!isMobile && (
          <Button color="orange" className="absolute left-16px bottom-24px right-16px h-48px rounded-100px text-16px !font-medium" onClick={hidePopup}>
            Close
          </Button>
        )}
      </>
    );
  }

  return null;
};

const showConfirmTransactionModal = ({
  className,
  title,
  subTitle,
  onClose,
  height,
  ...props
}: CommonProps & { title: string; subTitle?: string; onClose?: VoidFunction; height?: 'full' | 'half' | number }) => {
  if (isMobile) {
    showDrawer({
      Content: <ConfirmTransactionModal {...props} />,
      title,
      subTitle,
      onClose,
      height: height || 'half',
    });
  } else {
    showModal({ Content: <ConfirmTransactionModal {...props} />, className, title, subTitle, onClose });
  }
};

export default showConfirmTransactionModal;

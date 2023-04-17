import React, { useState, useCallback, type ReactNode, useEffect } from 'react';
import { useNavigate, type NavigateFunction, type To, type NavigateOptions } from 'react-router-dom';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { isMobile } from '@utils/is';
import { type Token } from '@service/tokens';
import { addRecordToHistory, type HistoryRecord } from '@service/history';
import { RecordAction } from '@modules/Navbar/AccountDetailDropdown/History';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { ReactComponent as SuccessIcon } from '@assets/icons/success.svg';
import { ReactComponent as FailedIcon } from '@assets/icons/failed.svg';
import { useRefreshData, RefreshTypeMap } from '@modules/Navbar/AccountDetailDropdown/History';

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
  setNextInfo: (info: { txHash: string; recordParams?: Omit<HistoryRecord, 'txHash' | 'status'> }) => void;
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
  const refreshFuncs = useRefreshData();

  const setNextInfo = useCallback(async ({ txHash, recordParams }: { txHash: string; recordParams?: Omit<HistoryRecord, 'txHash' | 'status'> }) => {
    try {
      setTxHash(txHash);
      setStep(Step.WaitReceipt);
      if (recordParams) {
        setRecordParams(recordParams);
        addRecordToHistory({
          txHash,
          ...recordParams,
        });
      }
      const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
      await receiptPromise;
      if (recordParams && RefreshTypeMap[recordParams?.type]) {
        const refreshFunc = refreshFuncs[RefreshTypeMap[recordParams.type]];
        await refreshFunc?.();
      }

      setStep(Step.Success);
    } catch (_) {
      setStep(Step.Failed);
    }
  }, []);

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
      <div className="absolute left-0 w-full top-1/2 -translate-y-1/2 text-center">
        <Spin className="mb-72px mx-auto block text-88px text-orange-normal" />
        <p className="leading-28px text-center text-22px text-black-normal whitespace-nowrap">Waiting for confirmation</p>
        {recordParams && (
          <p className="px-36px leading-28px text-center text-22px text-black-normal">
            <RecordAction className="text-22px text-black-normal" txHash={txHash} {...recordParams} />
          </p>
        )}
        <p className="mt-16px text-center leading-18px text-14px text-gray-normal font-medium">Confirm this transaction in your wallet</p>
      </div>
    );
  }

  if (step === Step.Success) {
    return (
      <>
        <div className="w-fit absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <SuccessIcon className="mx-auto block w-92px h-70px mb-80px" />
          <p className="leading-28px text-22px text-black-normal">Transaction submitted</p>
          {tokenNeededAdd && (
            <div className="mt-8px px-24px h-40px leading-40px rounded-100px bg-orange-light-hover text-center text-14px text-black-normal font-medium cursor-pointer">
              Add {tokenNeededAdd.symbol}
            </div>
          )}
        </div>
        <a
          href={`${import.meta.env.VITE_ESpaceScanUrl}/tx/${txHash}`}
          className="absolute left-16px bottom-72px right-16px leading-18px text-center text-14px text-orange-normal font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Block Explorer
        </a>
        <Button color="orange" className="absolute left-16px bottom-16px right-16px h-48px rounded-100px text-16px !font-bold" onClick={hidePopup}>
          Close
        </Button>
      </>
    );
  }

  if (step === Step.Failed) {
    return (
      <>
        <div className="w-fit absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <FailedIcon className="mx-auto block w-70px h-70px mb-80px" />
          <p className="leading-28px text-22px text-black-normal">Transaction failed</p>
        </div>
        <Button color="orange" className="absolute left-16px bottom-16px right-16px h-48px rounded-100px text-16px !font-bold" onClick={hidePopup}>
          Close
        </Button>
      </>
    );
  }

  return null;
};

const showConfirmTransactionModal = ({ className, title, subTitle, onClose, ...props }: CommonProps & { title: string; subTitle?: string; onClose?: VoidFunction }) => {
  if (isMobile) {
    showDrawer({
      Content: <ConfirmTransactionModal {...props} />,
      title,
      subTitle,
      onClose,
    });
  } else {
    showModal({ Content: <ConfirmTransactionModal {...props} />, className: className, title, subTitle, onClose });
  }
};

export default showConfirmTransactionModal;

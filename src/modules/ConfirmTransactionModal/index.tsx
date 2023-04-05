import React, { useState, useCallback, type ReactNode } from 'react';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { isMobile } from '@utils/is';
import { type Token } from '@service/tokens';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { ReactComponent as SuccessIcon } from '@assets/icons/success.svg';
import { ReactComponent as FailedIcon } from '@assets/icons/failed.svg';

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
}

export interface ConfirmModalInnerProps {
  setNextInfo?: (info: { txHash: string; action: string }) => void;
}

const ConfirmTransactionModal: React.FC<CommonProps & { children?: ReactNode | (() => ReactNode) }> = ({ initialStep = Step.Confirm, ConfirmContent, tokenNeededAdd }) => {
  const [step, setStep] = useState(() => initialStep);
  const [txHash, setTxHash] = useState('');
  const [action, setAction] = useState('');

  const setNextInfo = useCallback(async ({ txHash, action }: { txHash: string; action?: string }) => {
    try {
      setTxHash(txHash);
      setStep(Step.WaitReceipt);
      if (action) {
        setAction(action);
      }
      const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
      await receiptPromise;
      setStep(Step.Success);
    } catch (_) {
      setStep(Step.Failed);
    }
  }, []);

  if (step === Step.Confirm) {
    return <ConfirmContent setNextInfo={setNextInfo} />;
  }

  if (step === Step.WaitReceipt) {
    return (
      <div className="w-fit absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Spin className="mb-72px mx-auto block text-88px" />
        <p className="leading-28px text-center text-22px text-black-normal">
          Waiting for confirmation
          {action && <br />}
          {action && <span dangerouslySetInnerHTML={{ __html: action }} />}
        </p>
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

const showConfirmTransactionModal = ({ className, title, ...props }: CommonProps & { title: string }) => {
  if (isMobile) {
    showDrawer({
      Content: <ConfirmTransactionModal {...props} />,
      title,
    });
  } else {
    showModal({ Content: <ConfirmTransactionModal {...props} />, className: className, title });
  }
};

export default showConfirmTransactionModal;

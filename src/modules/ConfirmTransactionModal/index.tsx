import React from "react";
import { showModal, showDrawer } from "@components/showPopup";
import { isMobile } from '@utils/is';

export enum Step {
  Confirm = 0,
  Confirm2,
  WaitReceipt,
  Success,
  Rejected,
  Failed,
}

const ConfirmTransactionModal: React.FC<Props> = () => {
  return (
    <div>
    </div>
  )
};


interface Props {
  className?: string;
  style?: React.CSSProperties;
}

const showConfirmTransactionModal = (props: Props) => {
  if (isMobile) {
    showDrawer({ Content: <ConfirmTransactionModal {...props}/>, title: '连接钱包' });
  } else {
    showModal({ Content: <ConfirmTransactionModal />, className: '!max-w-370px', title: '连接钱包' }) as string;
  }
};

export default showConfirmTransactionModal;
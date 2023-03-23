import React, { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import cx from 'clsx';
import { useAccount } from '@service/account';
import { PopupClass } from '@components/Popup';
import BorderBox from '@components/Box/BorderBox';
import renderReactNode from '@utils/renderReactNode';
import usePressEsc from '@hooks/usePressEsc';
import useCloseOnRouterBack from '../useCloseOnRouterBack';
import { recordCurrentPopup, hidePopup } from '../';
import './index.css';

export const ModalPopup = new PopupClass(true);
ModalPopup.initPromise.then(() => {
  ModalPopup.setListClassName('modal-wrapper');
});

const Modal: React.FC<{ Content: ReactNode | Function; title: string; className?: string; onClose?: VoidFunction }> = memo(({ Content, title, className, onClose }) => {
  const account = useAccount();

  const hasInit = useRef(false);
  useEffect(() => {
    if (!hasInit.current) {
      hasInit.current = true;
      return;
    }
    hidePopup();
  }, [account]);

  const handleClose = useCallback(() => {
    ModalPopup.hideAll();
    onClose?.();
  }, [onClose]);

  usePressEsc(hidePopup);
  useCloseOnRouterBack(handleClose);

  return (
    <BorderBox variant="gradient-white" className={cx('relative w-90vw max-w-400px px-16px py-24px rounded-24px overflow-hidden shadow-popper', className)}>
      <div className="px-8px flex justify-between items-center text-14px text-black-normal">
        {title}
        <span className="i-ep:close-bold text-14px cursor-pointer" onClick={hidePopup} />
      </div>
      {renderReactNode(Content)}
    </BorderBox>
  );
});

export const showModal = (props: { Content: Function | ReactNode; title: string; className?: string; onClose?: VoidFunction }) => {
  const popupId = ModalPopup.show({
    Content: <Modal {...props} />,
    duration: 0,
    showMask: true,
    animationType: 'door',
    pressEscToClose: true,
  });
  recordCurrentPopup(popupId);
  return popupId;
};

export const hideModal = (key: string | number) => ModalPopup.hide(key);
export const hideAllModal = () => ModalPopup.hideAll();
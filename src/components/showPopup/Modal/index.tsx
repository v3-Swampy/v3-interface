import React, { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import cx from 'clsx';
import { useAccount } from '@service/account';
import { PopupClass } from '@components/Popup';
import BorderBox from '@components/Box/BorderBox';
import renderReactNode from '@utils/renderReactNode';
import usePressEsc from '@hooks/usePressEsc';
import { ReactComponent as CloseBoldIcon } from '@assets/icons/close_bold.svg';
import useCloseOnRouterBack from '../useCloseOnRouterBack';
import { recordCurrentPopup, hidePopup, recordHideCurrentPopup } from '../';
import './index.css';

export const ModalPopup = new PopupClass(true);
ModalPopup.initPromise.then(() => {
  ModalPopup.setListClassName('modal-wrapper');
});
ModalPopup.setAnimatedSize(false);

const Modal: React.FC<{ Content: ReactNode | Function; title: string; subTitle?: string; className?: string; onClose?: VoidFunction }> = memo(
  ({ Content, title, subTitle, className, onClose }) => {
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
      // setTimeout(() => {
      //   recordHideCurrentPopup();
      // }, 64);
    }, [onClose]);

    usePressEsc(hidePopup);
    useCloseOnRouterBack(handleClose);

    return (
      <BorderBox variant="gradient-white" className={cx('relative w-90vw max-w-400px px-16px py-24px rounded-24px overflow-hidden shadow-popper', className)}>
        <div className="px-8px flex justify-between items-center text-14px text-black-normal font-medium">
          {title}
          <CloseBoldIcon className="w-12px h-12px cursor-pointer" onClick={hidePopup} />
        </div>
        {subTitle && <div className="px-8px text-14px font-medium leading-18px font-not-italic color-gray-normal mt-1">{subTitle}</div>}
        {renderReactNode(Content)}
      </BorderBox>
    );
  }
);

export const showModal = ({
  unique,
  ...props
}: {
  Content: Function | ReactNode;
  title: string;
  subTitle?: string;
  className?: string;
  onClose?: VoidFunction;
  unique?: boolean;
}) => {
  const popupId = ModalPopup.show({
    Content: <Modal {...props} />,
    duration: 0,
    showMask: true,
    animationType: 'door',
    pressEscToClose: true,
    unique,
  });
  recordCurrentPopup(popupId);
  return popupId;
};

export const hideModal = (key: string | number) => ModalPopup.hide(key);
export const hideAllModal = () => ModalPopup.hideAll();

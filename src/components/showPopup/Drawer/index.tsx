import React, { memo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import cx from 'clsx';
import { useAccount } from '@service/account';
import { DrawerClass } from '@components/Drawer';
import renderReactNode from '@utils/renderReactNode';
import { ReactComponent as CloseBoldIcon } from '@assets/icons/close_bold.svg';
import useCloseOnRouterBack from '../useCloseOnRouterBack';
import { recordCurrentPopup, hidePopup, recordHideCurrentPopup, currentPopup } from '../';

export const DrawerPopup = new DrawerClass(true);

const Drawer: React.FC<{ Content: ReactNode | Function; title: string; subTitle?: string; className?: string; onClose?: VoidFunction }> = memo(
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
      DrawerPopup.hide();
      onClose?.();
      recordHideCurrentPopup();
    }, [onClose]);

    useCloseOnRouterBack(handleClose);

    return (
      <div className={cx('px-16px p-24px pb-40px h-full rounded-tl-16px rounded-tr-16px', className)}>
        <div className="flex justify-between items-center leading-18px text-14px text-black-normal font-medium">
          {title}
          <CloseBoldIcon className="w-12px h-12px cursor-pointer" onClick={hidePopup} />
        </div>
        {subTitle && <div className="text-14px font-500 leading-18px font-not-italic color-gray-normal mt-1">{subTitle}</div>}

        {renderReactNode(Content)}
      </div>
    );
  }
);

export const showDrawer = ({ height, ...props }: { Content: React.ReactNode; title: string; subTitle?: string; onClose?: VoidFunction; height?: number | 'full' | 'half' }) => {
  if (currentPopup !== null) return;
  const popupId = DrawerPopup.show(<Drawer {...props} />, { height });
  if (popupId === null) return;
  recordCurrentPopup(popupId);
  return popupId;
};

export const hideDrawer = () => DrawerPopup.hide();
export const hideAllDrawer = () => DrawerPopup.hide();


import React from 'react';
import { isMobile } from '@utils/is';
import useClipboard from 'react-use-clipboard';
import useI18n, { compiled } from '@hooks/useI18n';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import { ReactComponent as WarningColorIcon } from '@assets/icons/warning_color.svg';
import { ReactComponent as WarningAddTokenIcon } from '@assets/icons/warning_add_token.svg';
import { ReactComponent as CopyIcon } from '@assets/icons/copy_bold.svg';
import { ReactComponent as ShareIcon } from '@assets/icons/share_bold.svg';
import Button from '@components/Button';
import Tooltip from '@components/Tooltip';


const transitions = {
  en: {
    cancel: 'Cancel',
    confirm: 'I understand',
    warning: 'Warning',
    add_warning_desc: "This token isn't traded on leading U.S centralized exchanges or frequently swapped on Uniswap. Always conduct your own research before trading.",
  },
  zh: {
    cancel: 'Cancel',
    confirm: 'I understand',
    warning: 'Warning',
    add_warning_desc: "This token isn't traded on leading U.S centralized exchanges or frequently swapped on Uniswap. Always conduct your own research before trading.",
  },
} as const;
interface CommonProps {
  className?: string;
  tokenAddress: string;
  onConfirm?: () => {}
}

const AddTokenWarningModal: React.FC<CommonProps> = ({ tokenAddress, onConfirm, className }) => {
  const i18n = useI18n(transitions);

  const scanUrl = `${import.meta.env.VITE_ESpaceScanUrl}/token/${tokenAddress}`;

  const [isCopied, copy] = useClipboard(scanUrl, { successDuration: 1000 });

  const handleConfirm = () => {
    onConfirm?.()
  }

  return <div className="flex flex-col items-center">
    <WarningAddTokenIcon className="w-80px h-80px mt-72px mb-16px" />
    <div className="flex items-center mb-32px">
      <WarningColorIcon className="w-16px h-13.5px mr-2px" />
      <span>{i18n.warning}</span>
    </div>
    <p className="text-black-normal text-16px leading-20px font-medium mb-60px">
      {i18n.add_warning_desc}
    </p>
    <div className="bg-orange-light-hover rounded-32px flex items-center justify-center w-full py-4px text-orange-normal text-14px leading-18px">
      <span className="w-275px text-ellipsis overflow-hidden">
        {scanUrl}
      </span>
      <a className="w-24px h-24px flex items-center justify-center rounded-24px bg-orange-light cursor-pointer mx-4px"
        target="_blank"
        rel="noopener noreferrer"
        href={scanUrl}>
        <ShareIcon className="w-12px h-12px text-orange-normal" />
      </a>
      <Tooltip visible={isCopied} text="复制成功">
        <div className="w-24px h-24px flex items-center justify-center rounded-24px bg-orange-light cursor-pointer" onClick={copy}>
          <CopyIcon className="w-12px h-12px text-orange-normal" />
        </div>
      </Tooltip>
    </div>
    <div className="flex flex-1 w-full mt-16px gap-16px">
      <div className="flex h-48px flex-1">
        <Button className="h-48px rounded-100px text-16px leading-20px flex items-center w-full !font-bold" variant='outlined' color="gray" onClick={hidePopup}>
          {i18n.cancel}
        </Button>
      </div>
      <div className="flex h-48px flex-1">
        <Button className="h-48px rounded-100px text-16px leading-20px flex items-center w-full !font-bold" onClick={handleConfirm}>
          {i18n.confirm}
        </Button>
      </div>
    </div>
  </div>
};

const showAddTokenWarningModal = ({ className, title, subTitle, onClose, ...props }: CommonProps & { title: string; subTitle?: string; onClose?: VoidFunction; }) => {
  if (isMobile) {
    showDrawer({
      Content: <AddTokenWarningModal {...props} />,
      title,
      subTitle,
      onClose,
    });
  } else {
    showModal({ Content: <AddTokenWarningModal {...props} />, className, title, subTitle, onClose });
  }
};

export default showAddTokenWarningModal;
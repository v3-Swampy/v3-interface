
import React from 'react';
import { isMobile } from '@utils/is';
import useI18n from '@hooks/useI18n';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import { ReactComponent as WarningIcon } from '@assets/icons/warning.svg';
import { ReactComponent as WarningWhiteIcon } from '@assets/icons/warning_white.svg';
import { useExpertMode } from '@service/settings';
import Button from '@components/Button';

interface CommonProps {
  className?: string;
}

const ExpertModeModal: React.FC<CommonProps> = () => {
  const [expertMode, setExpertMode] = useExpertMode();

  const handleConfirm = () => {
    const confirmWord = `confirm`;
    if (window.prompt(`Please type the word "${confirmWord}" to enable expert mode.`) === confirmWord) {
      setExpertMode(true);
      hidePopup();
    }
  }
  return <div className="flex flex-col items-center">
    <WarningIcon className="w-80px h-68px mt-74px mb-30px" />
    <p className="text-18px leading-30px text-#000 mb-72px w-270px font-medium">ONLY USE THIS MODE IF YOU KNOW WHAT YOU ARE DOING.</p>
    <p className="text-16px leading-20px text-#8e8e8e mb-16px font-light">Expert mode turns off the confirm transaction prompt and allows high slippage trades that often result in bad rates and lost funds.</p>
    <Button className="h-48px rounded-100px text-16px w-full !font-bold bg-#e14e28 flex items-center" onClick={handleConfirm}>
      <WarningWhiteIcon className="w-16px h-16px mr-8px" />
      Turn On Expert Mode
    </Button>
  </div>
};

const showExpertModeModal = ({ className, title, subTitle, onClose, ...props }: CommonProps & { title: string; subTitle?: string; onClose?: VoidFunction; }) => {
  if (isMobile) {
    showDrawer({
      Content: <ExpertModeModal {...props} />,
      title,
      subTitle,
      onClose,
    });
  } else {
    showModal({ Content: <ExpertModeModal {...props} />, className, title, subTitle, onClose });
  }
};

export default showExpertModeModal;
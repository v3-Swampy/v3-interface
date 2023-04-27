
import React from 'react';
import { isMobile } from '@utils/is';
import useI18n, { compiled } from '@hooks/useI18n';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import { ReactComponent as WarningColorIcon } from '@assets/icons/warning_color.svg';
import { ReactComponent as WarningWhiteIcon } from '@assets/icons/warning_white.svg';
import { useExpertMode } from '@service/settings';
import Button from '@components/Button';


const transitions = {
  en: {
    confirm: 'confirm',
    confirm_prompt: 'Please type the word "{confirmWord}" to enable expert mode.'
  },
  zh: {
    confirm: 'confirm',
    confirm_prompt: 'Please type the word "{confirmWord}" to enable expert mode.'
  },
} as const;
interface CommonProps {
  className?: string;
}

const ExpertModeModal: React.FC<CommonProps> = () => {
  const i18n = useI18n(transitions);
  const [expertMode, setExpertMode] = useExpertMode();

  const handleConfirm = () => {
    const confirmWord = i18n.confirm;
    if (window.prompt(compiled(i18n.confirm_prompt, { confirmWord: i18n.confirm })) === confirmWord) {
      setExpertMode(true);
      hidePopup();
    }
  }
  return <div className="flex flex-col items-center">
    <WarningColorIcon className="w-80px h-68px mt-74px mb-30px" />
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
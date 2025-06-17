
import React from 'react';
import cx from 'clsx';
import useI18n, { compiled } from '@hooks/useI18n';
import { showModal, showDrawer, hidePopup } from '@components/showPopup';
import { ReactComponent as WarningColorIcon } from '@assets/icons/warning_color.svg';
import { ReactComponent as WarningWhiteIcon } from '@assets/icons/warning_white.svg';
import { useExpertMode } from '@service/settings';
import Button from '@components/Button';
import { isMobile } from '@utils/is';

const transitions = {
  en: {
    confirm: 'confirm',
    confirm_prompt: 'Please type the word "{confirmWord}" to enable expert mode.',
    remind_title: 'ONLY USE THIS MODE IF YOU KNOW WHAT YOU ARE DOING.',
    remind_desc: 'Expert mode turns off the confirm transaction prompt and allows high slippage trades that often result in bad rates and lost funds.',
    turn_on_expert_mode: 'Turn On Expert Mode',
  },
  zh: {
    confirm: 'confirm',
    confirm_prompt: 'Please type the word "{confirmWord}" to enable expert mode.',
    remind_title: 'ONLY USE THIS MODE IF YOU KNOW WHAT YOU ARE DOING.',
    remind_desc: 'Expert mode turns off the confirm transaction prompt and allows high slippage trades that often result in bad rates and lost funds.',
    turn_on_expert_mode: 'Turn On Expert Mode',
  },
} as const;
interface CommonProps {
  className?: string;
}

const ExpertModeModal: React.FC<CommonProps> = ({ className }) => {
  const i18n = useI18n(transitions);
  const [expertMode, setExpertMode] = useExpertMode();

  const handleConfirm = () => {
    const confirmWord = i18n.confirm;
    if (window.prompt(compiled(i18n.confirm_prompt, { confirmWord: i18n.confirm })) === confirmWord) {
      setExpertMode(true);
    }
    hidePopup();
  }
  return <div className="flex flex-col items-center">
    <WarningColorIcon className={cx("w-80px h-68px mb-30px", isMobile ? 'mt-44px' : 'mt-72px')} />
    <p className={cx("text-center text-18px leading-30px text-#000 w-310px font-normal", isMobile ? 'mb-36px' : 'mb-72px')}>{i18n.remind_title}</p>
    <p className="text-16px leading-20px text-#8e8e8e mb-16px font-light">{i18n.remind_desc}</p>
    <Button className="h-48px rounded-100px text-16px w-full !font-medium" onClick={handleConfirm}>
      <WarningWhiteIcon className="w-16px h-16px mr-8px" />
      {i18n.turn_on_expert_mode}
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
      height: 'half'
    });
  } else {
    showModal({ Content: <ExpertModeModal {...props} />, className, title, subTitle, onClose });
  }
};

export default showExpertModeModal;
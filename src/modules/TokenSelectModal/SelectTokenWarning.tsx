import React from 'react';
import useClipboard from 'react-use-clipboard';
import useI18n, { compiled } from '@hooks/useI18n';
import BorderBox from '@components/Box/BorderBox';
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
    add_warning_desc: "{tokenSymbol} isn't traded on leading U.S centralized exchanges or frequently swapped on vSwap. Always conduct your own research before trading.",
  },
  zh: {
    cancel: 'Cancel',
    confirm: 'I understand',
    warning: 'Warning',
    add_warning_desc: "{tokenSymbol} isn't traded on leading U.S centralized exchanges or frequently swapped on vSwap. Always conduct your own research before trading.",
  },
} as const;

const SelectTokenWarning: React.FC<{ tokenSymbol: string; tokenAddress: string; onConfirm?: VoidFunction; onCancel?: VoidFunction }> = ({
  tokenSymbol,
  tokenAddress,
  onConfirm,
  onCancel,
}) => {
  const i18n = useI18n(transitions);

  const scanUrl = `${import.meta.env.VITE_ESpaceScanUrl}/token/${tokenAddress}`;

  const [isCopied, copy] = useClipboard(scanUrl, { successDuration: 1000 });

  return (
    <BorderBox
      variant="gradient-white"
      className="z-1000 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-360px max-w-90vw px-16px py-24px rounded-24px overflow-hidden shadow-popper"
    >
      <div className="px-8px flex justify-between items-center text-14px text-black-normal font-medium"></div>
      <div className="flex flex-col items-center">
        <WarningAddTokenIcon className="w-80px h-80px mb-16px" />
        <div className="flex items-center mb-32px">
          <WarningColorIcon className="w-16px h-13.5px mr-2px" />
          <span className="token-warning-text">{i18n.warning}</span>
        </div>
        <p className="text-black-normal text-16px leading-20px mb-32px">{compiled(i18n.add_warning_desc, { tokenSymbol })}</p>
        <div className="bg-orange-light-hover rounded-32px flex items-center justify-center w-full py-4px text-orange-normal text-14px leading-18px">
          <span className="w-275px text-ellipsis overflow-hidden">{scanUrl}</span>
          <a className="w-24px h-24px flex items-center justify-center rounded-24px bg-orange-light cursor-pointer mx-4px" target="_blank" rel="noopener noreferrer" href={scanUrl}>
            <ShareIcon className="w-12px h-12px text-orange-normal" />
          </a>
          <Tooltip visible={isCopied} text="Copied!">
            <div className="w-24px h-24px flex items-center justify-center rounded-24px bg-orange-light cursor-pointer" onClick={copy}>
              <CopyIcon className="w-12px h-12px text-orange-normal" />
            </div>
          </Tooltip>
        </div>
        <div className="flex flex-1 w-full mt-16px gap-16px">
          <div className="flex h-48px flex-1">
            <Button className="h-48px rounded-100px text-16px leading-20px flex items-center w-full !font-bold" variant="outlined" color="gray" onClick={onCancel}>
              {i18n.cancel}
            </Button>
          </div>
          <div className="flex h-48px flex-1">
            <Button className="h-48px rounded-100px text-16px leading-20px flex items-center w-full !font-bold" onClick={onConfirm}>
              {i18n.confirm}
            </Button>
          </div>
        </div>
      </div>
    </BorderBox>
  );
};

export default SelectTokenWarning;

import React, { memo } from 'react';
import cx from 'clsx';
import { type UseFormWatch, type FieldValues } from 'react-hook-form';
import { useSourceToken, useDestinationToken } from '@service/swap';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthApproveButton from '@modules/AuthApproveButton';
import { UniswapV3Factory } from '@contracts/index';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    please_select_token: 'Please select token',
    swap: 'Swap',
  },
  zh: {
    please_select_token: '请选择代币',
    swap: '交换',
  },
} as const;

interface Props {
  sourceTokenAmount: string;
}

const SubmitButton: React.FC<Props> = ({ sourceTokenAmount }) => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const isBothTokenSelected = sourceToken && destinationToken;

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthApproveButton {...buttonProps} tokenAddress={sourceToken?.address} contractAddress={UniswapV3Factory.address} amount={sourceTokenAmount}>
        <Button
          className={cx(buttonProps.className, !isBothTokenSelected && 'pointer-events-none')}
          color="gradient"
          fullWidth
          disabled={!isBothTokenSelected}
        >
          {isBothTokenSelected ? i18n.swap : i18n.please_select_token}
        </Button>
      </AuthApproveButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-24px h-40px text-18px rounded-100px',
  color: 'gradient',
  fullWidth: true,
} as const;

export default memo(SubmitButton);

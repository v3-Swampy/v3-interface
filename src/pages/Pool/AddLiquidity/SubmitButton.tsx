import React from 'react';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { NonfungiblePositionManager } from '@contracts/index';
import { useTokenA, useTokenB } from './SelectPair';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    preview: 'Preview',
    confirm: 'Confirm',
  },
  zh: {
    preview: '预览',
    confirm: '确认',
  },
} as const;

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string; inSubmitCreate: boolean; disabled: boolean }> = ({ amountTokenA, amountTokenB, inSubmitCreate, disabled }) => {
  const i18n = useI18n(transitions);
  const tokenA = useTokenA()!;
  const tokenB = useTokenB()!;

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton {...buttonProps} tokenAddress={tokenA?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenA}>
        <AuthTokenButton {...buttonProps} tokenAddress={tokenB?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenB}>
          <Button {...buttonProps} loading={inSubmitCreate} disabled={disabled}>{i18n.preview}</Button>
        </AuthTokenButton>
      </AuthTokenButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

export default SubmitButton;

import React from 'react';
import { useParams } from 'react-router-dom';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { type PositionForUI } from '@service/position';
import { NonfungiblePositionManager } from '@contracts/index';
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

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string; inSubmitCreate: boolean; position: PositionForUI | undefined; }> = ({ amountTokenA, amountTokenB, inSubmitCreate, position }) => {
  const i18n = useI18n(transitions);

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton {...buttonProps} tokenAddress={position?.token0?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenA}>
        <AuthTokenButton {...buttonProps} tokenAddress={position?.token1?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenB}>
          <Button {...buttonProps} loading={inSubmitCreate}>{i18n.preview}</Button>
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

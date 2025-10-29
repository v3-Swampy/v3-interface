import React from 'react';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { AutoPositionManager } from '@contracts/index';
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

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string; inSubmitCreate: boolean; disabled: boolean }> = ({
  amountTokenA,
  amountTokenB,
  inSubmitCreate,
  disabled,
}) => {
  const i18n = useI18n(transitions);
  const tokenA = useTokenA()!;
  const tokenB = useTokenB()!;

  return (
    <AuthConnectButton id="pool-add-liquidity-auth-connect" {...buttonProps}>
      <AuthTokenButton id="pool-add-liquidity-auth-erc20info-tokenA" {...buttonProps} tokenAddress={tokenA?.address} contractAddress={AutoPositionManager.address} amount={amountTokenA}>
        <AuthTokenButton id="pool-add-liquidity-auth-erc20info-tokenB" {...buttonProps} tokenAddress={tokenB?.address} contractAddress={AutoPositionManager.address} amount={amountTokenB}>
          <Button id="pool-add-liquidity-submit-button" {...buttonProps} loading={inSubmitCreate} disabled={disabled}>
            {i18n.preview}
          </Button>
        </AuthTokenButton>
      </AuthTokenButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px text-18px',
  fullWidth: true,
} as const;

export default SubmitButton;

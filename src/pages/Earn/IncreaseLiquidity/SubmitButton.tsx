import React from 'react';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { AutoPositionManager } from '@contracts/index';
import { type Token } from '@service/tokens';
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

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string; inSubmitCreate: boolean; tokenA: Token | null | undefined; tokenB: Token | null | undefined }> = ({
  amountTokenA,
  amountTokenB,
  inSubmitCreate,
  tokenA,
  tokenB,
}) => {
  const i18n = useI18n(transitions);

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton
        {...buttonProps}
        tokenAddress={tokenA?.address}
        contractAddress={AutoPositionManager.address}
        amount={amountTokenA}
        id="pool-increase-liquidity-auth-erc20info-tokenA"
      >
        <AuthTokenButton
          {...buttonProps}
          tokenAddress={tokenB?.address}
          contractAddress={AutoPositionManager.address}
          amount={amountTokenB}
          id="pool-increase-liquidity-auth-erc20info-tokenB"
        >
          <Button {...buttonProps} loading={inSubmitCreate} id="pool-increase-liquidity-submit-button">
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

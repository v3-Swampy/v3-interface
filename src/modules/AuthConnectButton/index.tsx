import React, { useCallback, type ComponentProps } from 'react';
import { targetChainId, useAccount, useChainId, switchChain } from '@service/account';
import Button from '@components/Button';
import showAccountConnector from '@modules/Navbar/AccountConnector';

/**
 * Detects if the wallet is connected and is on the correct network.
 * If the detection passes, the children element is displayed.
 * Otherwise, the button with the connection and switch network functions is displayed.
 */
const AuthConnectButton: React.FC<ComponentProps<typeof Button>> = ({ children, ...props }) => {
  const account = useAccount();
  const chainId = useChainId();
  const chainMatch = chainId === targetChainId;

  const handleClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(() => {
    if (!account) {
      showAccountConnector();
    } else {
      switchChain();
    }
  }, [account, chainMatch]);

  if (account && chainMatch) return children as React.ReactElement;
  return (
    <Button id="auth-connect-btn" {...props} onClick={handleClick}>
      {!account && '连接账户'}
      {!!account && !chainMatch && '切换网络'}
    </Button>
  );
};

export default AuthConnectButton;

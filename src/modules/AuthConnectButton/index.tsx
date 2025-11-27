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

  const handleClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (evt) => {
      if (!account) {
        showAccountConnector();
      } else {
        switchChain();
      }
    },
    [account, chainMatch]
  );

  if (account && chainMatch) return children as React.ReactElement;
  return (
    <Button id="auth-connect-btn" {...props} onClick={handleClick} type="button">
      {!account && 'Connect Wallet'}
      {!!account && !chainMatch && 'Switch Network'}
    </Button>
  );
};

export const NavbarAuthConnectButton: React.FC<ComponentProps<typeof Button>> = ({ children, ...props }) => {
  const account = useAccount();
  const chainId = useChainId();
  const chainMatch = chainId === targetChainId;

  const handleClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (evt) => {
      if (!account) {
        showAccountConnector();
      } else {
        switchChain();
      }
    },
    [account, chainMatch]
  );

  if (account && chainMatch) return children as React.ReactElement;
  return (
    <>
      <Button
        id="auth-connect-btn"
        onClick={handleClick}
        type="button"
        {...props}
        className="lt-mobile:hidden flex-shrink-0 mobile:min-w-144px h-40px text-14px px-8px rounded-100px"
      >
        {!account && 'Connect Wallet'}
        {!!account && !chainMatch && 'Switch Network'}
      </Button>
      <button
        id="auth-connect-btn"
        onClick={handleClick}
        type="button"
        {...props}
        className="mobile:hidden flex-shrink-0 h-32px text-14px !px-16px rounded-100px [background:white]"
      >
        <span className="text-gradient-orange">
          {!account && 'Connect '}
          {!!account && !chainMatch && 'Switch'}
        </span>
      </button>
    </>
  );
};

export default AuthConnectButton;

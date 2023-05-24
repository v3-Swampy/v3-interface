import React, { type ComponentProps } from 'react';
import { showModal, showDrawer } from '@components/showPopup';
import fluentIcon from '@assets/icons/fluent.svg';
import metamaskIcon from '@assets/icons/metamask.svg';
import walletConnectIcon from '@assets/icons/wallet_connect.svg';
import { connect } from '@service/account';
import { isMobile } from '@utils/is';

const ConnectWallet: React.FC<ComponentProps<'div'> & { icon: string; name: string; connect: () => Promise<void> }> = ({ children, connect, icon, name }) => {
  return (
    <div onClick={connect} className="flex flex-col items-center justify-center w-100px h-100px rounded-8px hover:bg-#FFEDD5 transition-colors cursor-pointer">
      {children}
      <img className="w-30px h-30px mb-8px" src={icon} />
      <span className="text-14px text-gray-normal">{name}</span>
    </div>
  );
};

const ConnectModalContent: React.FC = () => {
  return (
    <div className="flex justify-center items-center gap-20px pt-20px pb-22px lt-md:justify-center">
      <ConnectWallet connect={() => connect('fluent')} icon={fluentIcon} name="Fluent" />
      <ConnectWallet connect={() => connect('metamask')} icon={metamaskIcon} name="MetaMask" />
      {/* <ConnectWallet connect={() => connect('walletConnect')} icon={walletConnectIcon} name="WalletConnect" /> */}
    </div>
  );
};

const showAccountConnector = () => {
  if (isMobile) {
    showDrawer({ Content: <ConnectModalContent />, height: 'half', title: 'Connect Wallet' });
  } else {
    showModal({ Content: <ConnectModalContent />, className: '!max-w-370px', title: 'Connect Wallet' });
  }
};

export default showAccountConnector;

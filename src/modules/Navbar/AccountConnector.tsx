import React, { type ComponentProps } from 'react';
import { showModal, showDrawer } from '@components/showPopup';
import { connect, useRegisteredWallets, createPrioritySorter } from '@cfx-kit/react-utils/dist/AccountManage';
import { isMobile } from '@utils/is';

const ConnectWallet: React.FC<ComponentProps<'div'> & { icon?: string; name: string; connect: () => Promise<void> }> = ({ children, connect, icon, name }) => {
  return (
    <div onClick={connect} className="flex flex-col items-center justify-center w-100px h-100px rounded-8px hover:bg-#FFEDD5 transition-colors cursor-pointer">
      {children}
      {icon && <img className="w-30px h-30px mb-8px" src={icon} />}
      <span className="text-14px text-gray-normal">{name}</span>
    </div>
  );
};

const prioritySorter = createPrioritySorter(['Fluent', 'MetaMask', 'WalletConnect']);

const ConnectModalContent: React.FC = () => {
  const wallets = useRegisteredWallets(prioritySorter);

  return (
    <div className="flex items-center gap-20px pt-20px pb-22px flex-wrap">
      {wallets.map((wallet) => (
        <ConnectWallet key={wallet.walletName} connect={() => connect(wallet.walletName)} icon={wallet.walletIcon} name={wallet.walletName} />
      ))}
    </div>
  );
};

const showAccountConnector = () => {
  if (isMobile) {
    showDrawer({ Content: <ConnectModalContent />, height: 'half', title: 'Connect Wallet' });
  } else {
    showModal({ Content: <ConnectModalContent />, className: 'min-w-370px!max-w-500px', title: 'Connect Wallet' });
  }
};

export default showAccountConnector;

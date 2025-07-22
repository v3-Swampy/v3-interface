import { RecoilRoot } from 'recoil';
import RecoilNexus from 'recoil-nexus';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import { initializeRecoil } from '@utils/recoilUtils';
import { ModalPopup, DrawerPopup, Toast } from '@components/showPopup';
import { isMobile } from '@utils/is';
import Router from './router';
import { tokenInitPromise } from '@service/tokens';
// import { farmingInitPromise } from '@service/farming/farmingList';
import { registerWallet } from '@cfx-kit/react-utils/dist/AccountManage';
import {
  createWalletConnectProvider,
  register6963Wallet,
} from '@cfx-kit/react-utils/dist/AccountManagePlugins';
import 'uno.css';
import 'reseter.css/css/reseter.css';
import 'custom-react-scrollbar/dist/style.css';
import './index.css';
import '@service/tokens';
import { targetChainId } from '@service/account';
import { isInMobileWalletBrowser } from '@utils/is';

const WalletConnectProvider = createWalletConnectProvider({
  projectId: '4e899f779e6ccef67d25e3804ace4af1',
  targetChainId: `eip155:${targetChainId}`,
  metadata: {
    name: "vSwap Finance",
    description:
      "A concentrated liquidity DEX on Conflux eSpace",
    url: window.location.host,
    icons: [`${window.location.origin}/logo.png`],
  },
});

if (!isInMobileWalletBrowser()) {
  registerWallet(WalletConnectProvider);
}
register6963Wallet({ persistFirst: true });

dayjs.extend(durationPlugin);

if (isMobile) {
  document.styleSheets[0].insertRule('.scrollbar__thumbPlaceholder--vertical { display:none !important; }', 0);
}

Promise.all([tokenInitPromise]).then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <RecoilRoot initializeState={initializeRecoil}>
      <RecoilNexus />
      <BrowserRouter>
        <ModalPopup.Provider />
        <DrawerPopup.Provider />
        <Toast.Provider />
        <Router />
      </BrowserRouter>
    </RecoilRoot>
  );
});

(function () {
  if (location.hash) {
    const url = new URL(location.href);
    url.hash = '';
    const newUrl = url.toString();
    history.replaceState(null, '', newUrl);
  }
})();

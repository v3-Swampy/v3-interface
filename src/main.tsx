import { RecoilRoot } from 'recoil';
import RecoilNexus from 'recoil-nexus';
import ReactDOM from 'react-dom/client';
import { completeDetect } from '@cfxjs/use-wallet-react/conflux';
import { initializeRecoil } from '@utils/recoilUtils';
import { ModalPopup, DrawerPopup, Toast } from '@components/showPopup';
import { isMobile } from '@utils/is';
import Router from './router';
import 'uno.css';
import 'reseter.css/css/reseter.css';
import 'custom-react-scrollbar/dist/style.css';
import './index.css';
import '@service/tokens';

if (isMobile) {
  document.styleSheets[0].insertRule('.scrollbar__thumbPlaceholder--vertical { display:none !important; }', 0);
}

completeDetect().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <RecoilRoot initializeState={initializeRecoil}>
      <RecoilNexus />
      <ModalPopup.Provider />
      <DrawerPopup.Provider />
      <Toast.Provider />
      <Router />
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

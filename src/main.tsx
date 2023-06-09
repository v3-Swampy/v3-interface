import { RecoilRoot } from 'recoil';
import RecoilNexus from 'recoil-nexus';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import { completeDetect } from '@cfxjs/use-wallet-react/ethereum';
import { initializeRecoil } from '@utils/recoilUtils';
import { ModalPopup, DrawerPopup, Toast } from '@components/showPopup';
import { isMobile } from '@utils/is';
import Router from './router';
import { tokenInitPromise } from '@service/tokens';
import { farmingInitPromise } from '@service/farming/farmingList';
import 'uno.css';
import 'reseter.css/css/reseter.css';
import 'custom-react-scrollbar/dist/style.css';
import './index.css';
import '@service/tokens';

dayjs.extend(durationPlugin);

if (isMobile) {
  document.styleSheets[0].insertRule('.scrollbar__thumbPlaceholder--vertical { display:none !important; }', 0);
}

Promise.all([completeDetect, tokenInitPromise, farmingInitPromise]).then(() => {
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

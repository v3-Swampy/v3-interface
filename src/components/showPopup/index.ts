export * from './Drawer';
export * from './Modal';
export * from './Toast';
import { hideAllModal } from './Modal';
import { hideAllDrawer } from './Drawer';

export let currentPopup: string | number | null = null;

export const hidePopup = () => {
  setTimeout(() => {
    const url = new URL(location.href);
    if (url.hash?.indexOf?.('#modal') === -1) {
      hideAllModal();
      hideAllDrawer();
      return;
    }
    url.hash = '';
    const newUrl = url.toString();
    history.back();
    setTimeout(() => {
      history.replaceState(null, '', newUrl);
      recordHideCurrentPopup();
    }, 16);
  }, 16);
};


export const recordCurrentPopup = (popupId: string | number) => (currentPopup = popupId);
export const recordHideCurrentPopup = () => currentPopup = null;
export const recordToHidePopup = () => {
  const currentPopupNow = currentPopup;
  return () => {
    if (currentPopup !== currentPopupNow || location.hash?.indexOf?.('#modal') === -1) return;
    hidePopup();
  };
};


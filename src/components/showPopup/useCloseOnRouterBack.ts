import { useLayoutEffect } from 'react';

const useCloseOnRouterBack = (closeModal: VoidFunction) => {
  useLayoutEffect(() => {
    history.replaceState(null, '', '');
    history.pushState(null, '', '#modal');

    const handleCloseModal = () => {
      closeModal?.();
    };

    globalThis.addEventListener('popstate', handleCloseModal);
    return () => {
      globalThis.removeEventListener('popstate', handleCloseModal);
    };
  }, [closeModal]);
};

export default useCloseOnRouterBack;

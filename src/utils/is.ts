export const isPromise = <T extends any>(obj: any): obj is Promise<T> => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

export const isFunction = (obj: any): obj is Function => typeof obj === 'function';

export const isNegative = (num: number): num is number => typeof num === 'number' && num < 0;

export const isOdd = (num: number) => num & 1;
export const isEven = (num: number) => !(num & 1);

export const isString = (str: string): str is string => typeof str === 'string';

export const isDOMElement = (obj: HTMLElement): obj is HTMLElement => {
  try {
    return obj instanceof HTMLElement;
  } catch (e) {
    return typeof obj === 'object' && obj.nodeType === 1 && typeof obj.style === 'object' && typeof obj.ownerDocument === 'object';
  }
};

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const isProduction = import.meta.env.MODE === 'production';

export const isLocalDev = location.host.startsWith('localhost') || location.host.startsWith('1');


const isRealMobileDevice = () => {
  const win = globalThis as any;

  const hasDesktopFeatures = !!(
    win.chrome?.runtime ||
    win.browser?.runtime ||
    win.opr ||
    win.safari?.pushNotification ||
    win.webkitRequestFileSystem
  );

  if (hasDesktopFeatures) {
    return false;
  }

  const hasTouchSupport = (
    'ontouchstart' in win ||
    navigator.maxTouchPoints > 0 ||
    (win.DocumentTouch && document instanceof win.DocumentTouch)
  );

  return isMobile && hasTouchSupport && !hasDesktopFeatures;
};

export const detectMobileWalletBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const win = globalThis as any;
  const isRealMobile = isRealMobileDevice();

  const walletDetection = {
    isMetaMaskMobile: !!(win.ethereum && win.ethereum.isMetaMask && isRealMobile),

    isTrustWallet: !!(win.ethereum && win.ethereum.isTrust && isRealMobile),

    isTokenPocket: !!(win.tokenpocket || userAgent.includes('tokenpocket')),

    isImToken: !!(win.imToken || userAgent.includes('imtoken')),

    isCoinbaseWallet: !!(win.ethereum && win.ethereum.isCoinbaseWallet && isRealMobile),

    isRainbow: !!(win.ethereum && win.ethereum.isRainbow && isRealMobile),

    isSafePal: !!(win.ethereum && win.ethereum.isSafePal && isRealMobile),

    isBitpie: !!(win.Bitpie || userAgent.includes('bitpie')),

    isHuobiWallet: !!(win.HuobiWallet || userAgent.includes('huobiwallet')),

    isMathWallet: !!(win.ethereum && win.ethereum.isMathWallet && isRealMobile),

    isBinanceChainWallet: !!(win.BinanceChain && isRealMobile),

    isOKXWallet: !!(win.okxwallet || win.okex),

    isPhantom: !!(win.phantom && win.phantom.ethereum && isRealMobile),

    isWalletConnect: !!(win.ethereum && win.ethereum.isWalletConnect && isRealMobile),

    is1inch: !!(win.ethereum && win.ethereum.is1inch && isRealMobile),

    isAlphaWallet: !!(win.ethereum && win.ethereum.isAlphaWallet && isRealMobile),

    isFluentWallet: !!(win.conflux),

    isWechat: userAgent.includes('micromessenger') && isRealMobile,

    isAlipay: userAgent.includes('alipayclient') && isRealMobile,

    isQQ: userAgent.includes('qq/') && isRealMobile,

    isWeibo: userAgent.includes('weibo') && isRealMobile,

    hasEthereumProvider: !!win.ethereum,

    hasConfluxProvider: !!win.conflux,

    hasWeb3: !!win.web3,

    isRealMobileDevice: isRealMobile,
  };

  const isInWalletBrowser = isRealMobile && Object.entries(walletDetection)
    .filter(([key]) => key !== 'hasEthereumProvider' && key !== 'hasConfluxProvider' && key !== 'hasWeb3' && key !== 'isRealMobileDevice')
    .some(([, value]) => value === true);

  const getWalletType = () => {
    if (walletDetection.isFluentWallet) return 'Fluent Wallet';
    if (walletDetection.isMetaMaskMobile) return 'MetaMask';
    if (walletDetection.isTrustWallet) return 'Trust Wallet';
    if (walletDetection.isTokenPocket) return 'TokenPocket';
    if (walletDetection.isImToken) return 'imToken';
    if (walletDetection.isCoinbaseWallet) return 'Coinbase Wallet';
    if (walletDetection.isRainbow) return 'Rainbow';
    if (walletDetection.isSafePal) return 'SafePal';
    if (walletDetection.isBitpie) return 'Bitpie';
    if (walletDetection.isHuobiWallet) return 'Huobi Wallet';
    if (walletDetection.isMathWallet) return 'MathWallet';
    if (walletDetection.isBinanceChainWallet) return 'Binance Chain Wallet';
    if (walletDetection.isOKXWallet) return 'OKX Wallet';
    if (walletDetection.isPhantom) return 'Phantom';
    if (walletDetection.isWalletConnect) return 'WalletConnect';
    if (walletDetection.is1inch) return '1inch Wallet';
    if (walletDetection.isAlphaWallet) return 'AlphaWallet';
    if (walletDetection.isWechat) return 'WeChat Browser';
    if (walletDetection.isAlipay) return 'Alipay Browser';
    if (walletDetection.isQQ) return 'QQ Browser';
    if (walletDetection.isWeibo) return 'Weibo Browser';
    return 'Unknown';
  };

  return {
    isInWalletBrowser,
    walletType: getWalletType(),
    ...walletDetection
  };
};

export const isInMobileWalletBrowser = () => {
  return detectMobileWalletBrowser().isInWalletBrowser;
};


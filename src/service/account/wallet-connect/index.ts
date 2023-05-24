import { atom } from 'recoil';
import SignClient from '@walletconnect/sign-client';
import QRCodeModal from '@walletconnect/qrcode-modal';
// export { connect, sendTransaction, watchAsset, addChain, switchChain } from '@cfxjs/use-wallet-react/ethereum/Fluent';

let signClient: SignClient;
(async function () {
  const client = await SignClient.init({
    projectId: '7e687248f1fa49c26ed5f2cf87404dc8',
    metadata: {
      name: 'Example Dapp',
      description: 'Example Dapp',
      url: window.location.host,
      icons: ['https://walletconnect.com/walletconnect-logo.png'],
    },
  });
  signClient = client;

  signClient.on('session_event', (event) => {
    console.log(event);
    // Handle session events, such as "chainChanged", "accountsChanged", etc.
  });

  signClient.on('session_update', ({ topic, params }) => {
    // const { namespaces } = params;
    // const _session = signClient.session.get(topic);
    // // Overwrite the `namespaces` of the existing session with the incoming one.
    // const updatedSession = { ..._session, namespaces };
    // // Integrate the updated session state into your dapp state.
    // onSessionUpdate(updatedSession);
  });

  signClient.on('session_delete', () => {
    // Session was deleted -> reset the dapp state, clean up from user session, etc.
  });
})();

export const accountState = atom<string | null | undefined>({
  key: 'walletConnectAccountState-vSwap',
  default: undefined,
  effects: [
    ({ setSelf, trigger }) => {
      // if (trigger === 'get') {
      //   setSelf(fluentStore.getState().accounts?.[0]);
      // }
      // const unsubFluentAccount = fluentStore.subscribe(
      //   (state) => state.accounts,
      //   (accounts) => setSelf(accounts?.[0])
      // );
      // return unsubFluentAccount;
    },
  ],
});

export const chainIdState = atom<string | null | undefined>({
  key: 'walletConnectChainIdState-vSwap',
  default: undefined,
  effects: [
    ({ setSelf, trigger }) => {
      // if (trigger === 'get') {
      //   setSelf(fluentStore.getState().chainId);
      // }
      // const unsubFluentAccount = fluentStore.subscribe(
      //   (state) => state.chainId,
      //   (chainId) => setSelf(chainId)
      // );
      // return unsubFluentAccount;
    },
  ],
});

export const disconnect = () => Promise<void>;

export const connect = async () => {
  try {
    const { uri, approval } = await signClient.connect({
      // Optionally: pass a known prior pairing (e.g. from `signClient.core.pairing.getPairings()`) to skip the `uri` step.
      pairingTopic: signClient.core.pairing.getPairings()?.[0]?.topic,
      // Provide the namespaces and chains (e.g. `eip155` for EVM-based chains) we want to use in this session.
      requiredNamespaces: {
        eip155: {
          methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
          chains: ['eip155:1'],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    //如果返回URI，则打开QRCode模式(即我们没有连接现有的配对)。
    if (uri) {
      QRCodeModal.open(uri, () => {
        console.log('EVENT', 'QR Code Modal closed');
      });
    }

    // 等待钱包的会话批准。
    const session = await approval();
    // 处理返回的会话(例如，将UI更新为“connected”状态)。
    // await onSessionConnected(session);
  } catch (e) {
    console.error(e);
  } finally {
    // 关闭QRCode模式，以防它是打开的。
    QRCodeModal.close();
  }
};

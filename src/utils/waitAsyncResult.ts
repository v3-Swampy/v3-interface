import { fetchChain } from '@utils/fetch';

export const isTransactionReceipt = async (txHash: string) => {
  const txReceipt: { blockNumber: string; blockHash: string; transactionHash: string; from: string; to: string; status: '0x0' | '0x1' } = await fetchChain({
    method: 'eth_getTransactionReceipt',
    params: [txHash],
  });

  if (txReceipt && txReceipt.blockNumber) {
    return txReceipt;
  }
  return null;
};


const transactionReceiptCache = new Map<string, Readonly<[Promise<NonNullable<Awaited<ReturnType<typeof isTransactionReceipt>>>>, VoidFunction, () => 'fulfilled' | 'rejected' | 'pending']>>();
export const waitTransactionReceipt = (txHash: string) => {
  const cachedRes = transactionReceiptCache.get(txHash);
  if (cachedRes) {
    const [_, __, getStatus] = cachedRes;
    const cachedStatus = getStatus();
    if (cachedStatus !== 'rejected') {
      return cachedRes;
    }
  }
  
  const newRes = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
  transactionReceiptCache.set(txHash, newRes);
  return newRes;
};

async function* endlessGenerator() {
  let count = 0;
  while (true) {
    yield count++;
  }
}

export const waitSeconds = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/**
 * @param {Number} maxWaitTime - max wait time in seconds; 0 means endless;
 */
const waitAsyncResult = <T extends () => Promise<any>>({ fetcher, maxWaitTime = 60, interval = 3 }: { fetcher: T; maxWaitTime?: number; interval?: number }) => {
  let reject: (reason?: any) => void;
  const stop = () => {
    status = 'rejected';
    reject(new Error('Wait async stop'));
  };

  let status: 'fulfilled' | 'rejected' | 'pending' = 'pending';
  const getStatus = () => status;

  const promise = new Promise<NonNullable<Awaited<ReturnType<T>>>>(async (resolve, _reject) => {
    reject = _reject;
    const generator = maxWaitTime === 0 ? endlessGenerator() : Array.from({ length: Math.floor(maxWaitTime / interval) });

    for await (const _ of generator) {
      try {
        const res = await fetcher();
        if (res) {
          status = 'fulfilled';
          resolve(res);
          return;
        }
      } catch (_) {
      } finally {
        await waitSeconds(interval);
      }
    }
    status = 'rejected';
    reject(new Error('Wait async timeout'));
  });

  return [promise, stop, getStatus] as const;
};

export const getAsyncResult = <T extends () => Promise<any>, K>(fetcher: T, callback: (args: K) => void, maxWaitTime: number = 44, interval = 2) => {
  let isStop = false;
  const stop = () => (isStop = true);

  const generator = maxWaitTime === 0 ? endlessGenerator() : Array.from({ length: Math.floor(maxWaitTime / interval) });
  const start = async () => {
    for await (const _ of generator) {
      if (isStop) {
        return;
      }

      const res = await fetcher();
      if (res) {
        callback(res);
      }
      await waitSeconds(interval);
    }
  };
  start();

  return stop;
};

export default waitAsyncResult;

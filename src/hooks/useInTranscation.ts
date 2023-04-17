import { useState, useCallback } from 'react';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';

const useInTranscation = <T extends (params: any) => void | Promise<any> | null | undefined>(transcationFunc: T, waitTxHash?: boolean) => {
  const [inTranscation, setInTranscation] = useState(false);
  const execTranscation = useCallback(async (params: any) => {
    try {
      setInTranscation(true);
      const res = await transcationFunc(params);
      if (waitTxHash === true && typeof res === 'string') {
        const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(res) });
        await receiptPromise;
      }
      setInTranscation(false);
      return res;
    } catch(err) {
      setInTranscation(false);
      throw err;
    }
  }, [transcationFunc]) as T;

  return { inTranscation, execTranscation };
};

export default useInTranscation;
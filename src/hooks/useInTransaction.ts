import { useState, useCallback } from 'react';
import { waitTransactionReceipt } from '@utils/waitAsyncResult';

const useInTransaction = <T extends (params: any) => void | Promise<any> | null | undefined>(transactionFunc: T, waitTxHash?: boolean) => {
  const [inTransaction, setInTransaction] = useState(false);
  const execTransaction = useCallback(async (params: any) => {
    try {
      setInTransaction(true);
      const res = await transactionFunc(params);
      if (waitTxHash === true && typeof res === 'string') {
        const [receiptPromise] = waitTransactionReceipt(res);
        await receiptPromise;
      }
      setInTransaction(false);
      return res;
    } catch(err) {
      setInTransaction(false);
      throw err;
    }
  }, [transactionFunc]) as T;

  return { inTransaction, execTransaction };
};

export default useInTransaction;
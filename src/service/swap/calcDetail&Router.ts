import { useEffect } from "react";
import { useSourceToken, useDestinationToken } from './tokenSelect';

export const useCalcDetailAndRouter = () => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

  useEffect(() => {
    if (!sourceToken || !destinationToken) return;

    // TODO: calc detail and router here;
  }, [sourceToken?.address, destinationToken?.address]);
}
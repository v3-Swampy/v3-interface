import { useEffect, useState } from 'react';
import { selector, useRecoilValue } from 'recoil';
import dayjs from 'dayjs';
import { UniswapV3Staker } from '@contracts/index';


const claimStartTimeQuery = selector({
  key: `claimStartTime-${import.meta.env.MODE}`,
  get: async () => {
    const response = await UniswapV3Staker.func.unclaimableEndtime();
    return response ? Number(response) : dayjs().unix();
  },
});

export const useClaimStartTime = () => useRecoilValue(claimStartTimeQuery);
export const useCanClaim = () => {
  const claimStartTime = useClaimStartTime();
  const [canClaim, setCanClaim] = useState<boolean>(false);
  useEffect(() => {
    const fn = () => {
      const diff = dayjs(claimStartTime * 1000).diff(dayjs(), 'second');
      if (diff <= 0) {
        setCanClaim(true);
        clearInterval(intervalId);
      } else {
        setCanClaim(false);
      }
    };

    const intervalId = setInterval(fn, 1000);

    fn();

    return () => clearInterval(intervalId);
  }, [claimStartTime]);
  return canClaim;
};

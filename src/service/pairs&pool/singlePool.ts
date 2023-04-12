import { useCallback, useEffect } from 'react';
import { atomFamily, useRecoilStateLoadable } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { throttle } from 'lodash-es';
import { createPoolContract, fetchMulticall } from '@contracts/index';
import { useUserActiveStatus, UserActiveStatus } from '@service/userActiveStatus';
import { getWrapperTokenByAddress, type Token } from '@service/tokens';
import { FeeAmount, Pool, isPoolEqual } from './';
import { isPoolExist } from './utils';
import computePoolAddress from './computePoolAddress';

export const poolState = atomFamily<Pool | null | undefined, string>({
  key: `poolState-${import.meta.env.MODE}`,
  default: undefined,
});

export const generatePoolKey = ({ tokenA, tokenB, fee }: { tokenA: Token | null; tokenB: Token | null; fee: FeeAmount | null }) => {
  if (!tokenA || !tokenB || !fee) return 'nullPool';
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
  return `${token0.address}:${token1.address}:${fee}`;
};

/**
 * fetch pool info.
 * return null is not exist.
 */
export const fetchPool = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) => {
  const wrapperedTokenA = getWrapperTokenByAddress(tokenA?.address)!;
  const wrapperedTokenB = getWrapperTokenByAddress(tokenB?.address)!;
  const params = { tokenA: wrapperedTokenA, tokenB: wrapperedTokenB, fee };
  if (!(await isPoolExist(params))) return null;

  const poolAddress = computePoolAddress(params);
  const poolContract = createPoolContract(poolAddress);
  return await fetchMulticall([
    [poolContract.address, poolContract.func.encodeFunctionData('slot0')],
    [poolContract.address, poolContract.func.encodeFunctionData('liquidity')],
  ]).then((res) => {
    const slots = res?.[0] && res?.[0] !== '0x' ? poolContract.func.decodeFunctionResult('slot0', res[0]) : null;
    const liquidityRes = res?.[1] && res?.[1] !== '0x' ? poolContract.func.decodeFunctionResult('liquidity', res[1]) : null;
    const pool = new Pool({
      ...params,
      address: poolAddress,
      sqrtPriceX96: slots?.[0] ? slots?.[0]?.toString() : null,
      liquidity: liquidityRes?.[0] ? liquidityRes?.[0].toString() : null,
      tickCurrent: slots?.[1] ? +slots?.[1].toString() : null,
    });
    return pool;
  });
};

const poolTracker = new Map<string, boolean>();
/**
 * get and continuously track the info of a pool.
 * tracker for the same token, only one should exist at the same time.
 * The poolInfo will be updated every 5 seconds when the user is active, and every 20 seconds when the user is inactive.
 * return null is not exist.
 */
export const usePool = ({ tokenA, tokenB, fee }: { tokenA: Token | null; tokenB: Token | null; fee: FeeAmount | null }) => {
  const userActiveStatus = useUserActiveStatus();
  const poolKey = generatePoolKey({ tokenA, tokenB, fee });
  const [{ state, contents }, setPool] = useRecoilStateLoadable(poolState(poolKey));
  const fetchAndSetPool = useCallback(
    throttle(() => tokenA && tokenB && fee && fetchPool({ tokenA, tokenB, fee }).then((pool) => !isPoolEqual(pool, getRecoil(poolState(poolKey))) && setPool(pool)), 2000),
    [tokenA?.address, tokenB?.address, fee]
  );

  useEffect(() => {
    if (!tokenA || !tokenB || !fee || poolTracker.has(poolKey)) {
      return;
    }

    poolTracker.set(poolKey, true);
    fetchAndSetPool();
    const timer = setInterval(fetchAndSetPool, userActiveStatus === UserActiveStatus.Active ? 5000 : 20000);

    return () => {
      poolTracker.delete(poolKey);
      clearInterval(timer);
    };
  }, [tokenA?.address, tokenB?.address, fee, userActiveStatus]);

  return {
    state,
    pool: contents as Pool | null | undefined,
  } as const;
};

/**
 * Force to get the latest info of a pool.
 * Usually used after a transaction is completed.
 */
export const updatePool = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) => {
  const pool = await fetchPool({ tokenA, tokenB, fee });
  const poolKey = `${tokenA?.address ?? 'tokenA'}:${tokenB?.address ?? 'tokenB'}:${fee ?? 'fee'}`;
  setRecoil(poolState(poolKey), pool);
};

// const TokenA = {
//   address: '0x2ed3dddae5b2f321af0806181fbfa6d049be47d8',
//   name: 'Wrapper CFX',
//   symbol: 'WCFX',
//   decimals: 18,
//   logoURI: 'https://scan-icons.oss-cn-hongkong.aliyuncs.com/mainnet/net1030%3Aacwnngzd52ztm8m32j9c3hekyn8njcgsrjg4p7yzea.png',
// };

// const TokenB = {
//   "address": "0x7d682e65efc5c13bf4e394b8f376c48e6bae0355",
//   "name": "Tether USD",
//   "symbol": "USDT",
//   "decimals": 18,
//   "logoURI": "https://scan-icons.oss-cn-hongkong.aliyuncs.com/mainnet/net1030%3Aad9kt4c7csz7xusdgscstf1vbr33azv132611febg1.png"
// }

// const fee = 3000;

// fetchPool({ tokenA: TokenA, tokenB: TokenB, fee });

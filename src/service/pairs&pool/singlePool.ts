import { useCallback, useEffect } from 'react';
import { atomFamily, useRecoilStateLoadable } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { throttle } from 'lodash-es';
import { createPoolContract, fetchMulticall, UniswapV3Factory } from '@contracts/index';
import { useUserActiveStatus, UserActiveStatus } from '@service/userActiveStatus';
import { getWrapperTokenByAddress, type Token } from '@service/tokens';
import { FeeAmount, Pool, isPoolEqual } from './';
import { isPoolExist } from './utils';
import computePoolAddress from './computePoolAddress';
import { chunk } from 'lodash-es';
import { type Position } from '@service/position';

/**
 * fetch pools info.
 */
export const fetchPools = async (positions: Pick<Position, 'token0' | 'token1' | 'fee'>[]) => {
  const len = positions.length;

  if (!len) return [];

  const multicallsOfGetPool = positions.map(({ token0, token1, fee }) => {
    return [UniswapV3Factory.address, UniswapV3Factory.func.interface.encodeFunctionData('getPool', [token0.address, token1.address, fee])];
  });

  // check pool exist
  const resOfGetPool =
    (await fetchMulticall(multicallsOfGetPool))?.map((res) => {
      if (typeof res !== 'string' || res === '0x' || res === '0x0000000000000000000000000000000000000000') {
        return false;
      }
      return true;
    }) || [];

  const multicallsOfPool = resOfGetPool
    .map((isExist, index) => {
      if (!isExist) return null;

      const { token0, token1, fee } = positions[index];
      const wrapperedTokenA = getWrapperTokenByAddress(token0?.address)!;
      const wrapperedTokenB = getWrapperTokenByAddress(token1?.address)!;
      const params = { tokenA: wrapperedTokenA, tokenB: wrapperedTokenB, fee };
      const poolAddress = computePoolAddress(params);
      const poolContract = createPoolContract(poolAddress);
      return [
        [poolContract.address, poolContract.func.interface.encodeFunctionData('slot0')],
        [poolContract.address, poolContract.func.interface.encodeFunctionData('liquidity')],
      ];
    })
    .filter((p) => p !== null)
    .flat();

  const resOfPool = chunk(await fetchMulticall(multicallsOfPool as any), 2).map(([slot0, liquidity], index) => {
    const { token0, token1, fee } = positions[index];
    const wrapperedTokenA = getWrapperTokenByAddress(token0?.address)!;
    const wrapperedTokenB = getWrapperTokenByAddress(token1?.address)!;
    const params = { tokenA: wrapperedTokenA, tokenB: wrapperedTokenB, fee };
    const poolAddress = computePoolAddress(params);
    const poolContract = createPoolContract(poolAddress);
    const slots = slot0 && slot0 !== '0x' ? poolContract.func.interface.decodeFunctionResult('slot0', slot0) : null;
    const liquidityRes = liquidity && liquidity !== '0x' ? poolContract.func.interface.decodeFunctionResult('liquidity', liquidity) : null;
    const pool = new Pool({
      ...params,
      address: poolAddress,
      sqrtPriceX96: slots?.[0] ? slots?.[0]?.toString() : null,
      liquidity: liquidityRes?.[0] ? liquidityRes?.[0].toString() : null,
      tickCurrent: slots?.[1] !== undefined ? +slots?.[1].toString() : null,
    });

    const poolKey = generatePoolKey({ tokenA: wrapperedTokenA, tokenB: wrapperedTokenB, fee });
    setRecoil(poolState(poolKey), pool);

    return pool;
  });
  return resOfPool;
};

export const poolState = atomFamily<Pool | null | undefined, string>({
  key: `poolState-${import.meta.env.MODE}`,
  default: undefined,
});

export const generatePoolKey = ({ tokenA, tokenB, fee }: { tokenA: Token | null | undefined; tokenB: Token | null | undefined; fee: FeeAmount | null | undefined }) => {
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
    [poolContract.address, poolContract.func.interface.encodeFunctionData('slot0')],
    [poolContract.address, poolContract.func.interface.encodeFunctionData('liquidity')],
  ]).then((res) => {
    const slots = res?.[0] && res?.[0] !== '0x' ? poolContract.func.interface.decodeFunctionResult('slot0', res[0]) : null;
    const liquidityRes = res?.[1] && res?.[1] !== '0x' ? poolContract.func.interface.decodeFunctionResult('liquidity', res[1]) : null;

    return createPool({
      ...params,
      sqrtPriceX96: slots?.[0] ? slots?.[0]?.toString() : null,
      liquidity: liquidityRes?.[0] ? liquidityRes?.[0].toString() : null,
      tickCurrent: slots?.[1] !== undefined ? +slots?.[1].toString() : null,
    });
  });
};

const poolTracker = new Map<string, boolean>();
/**
 * get and continuously track the info of a pool.
 * tracker for the same token, only one should exist at the same time.
 * The poolInfo will be updated every 5 seconds when the user is active, and every 20 seconds when the user is inactive.
 * return null is not exist.
 */
export const usePool = ({ tokenA, tokenB, fee }: { tokenA: Token | null | undefined; tokenB: Token | null | undefined; fee: FeeAmount | null | undefined }) => {
  const userActiveStatus = useUserActiveStatus();
  const poolKey = generatePoolKey({ tokenA, tokenB, fee });
  const [{ state, contents }, setPool] = useRecoilStateLoadable(poolState(poolKey));
  const fetchAndSetPool = useCallback(
    throttle(
      () =>
        tokenA &&
        tokenB &&
        fee &&
        fetchPool({ tokenA, tokenB, fee })
          .then((pool) => !isPoolEqual(pool, getRecoil(poolState(poolKey))) && setPool(pool))
          .catch((error) => console.log('usePool error: ', error)),
      2000
    ),
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

export const getPool = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) => {
  const poolKey = generatePoolKey({ tokenA, tokenB, fee });
  const pool = getRecoil(poolState(poolKey));
  if (pool) return pool;
  const poolFetched = await fetchPool({ tokenA, tokenB, fee });
  setRecoil(poolState(poolKey), poolFetched);
  return poolFetched;
};

/**
 * Force to get the latest info of a pool.
 * Usually used after a transaction is completed.
 */
export const updatePool = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) => {
  const pool = await fetchPool({ tokenA, tokenB, fee });
  setRecoil(poolState(generatePoolKey({ tokenA, tokenB, fee })), pool);
};

export const createPool = ({
  tokenA,
  tokenB,
  fee,
  sqrtPriceX96,
  liquidity,
  tickCurrent,
}: {
  tokenA: Token;
  tokenB: Token;
  fee: FeeAmount;
  sqrtPriceX96: string | null;
  liquidity: string | null;
  tickCurrent: number | null;
}) => {
  const wrapperedTokenA = getWrapperTokenByAddress(tokenA?.address)!;
  const wrapperedTokenB = getWrapperTokenByAddress(tokenB?.address)!;
  const params = { tokenA: wrapperedTokenA, tokenB: wrapperedTokenB, fee };
  const poolAddress = computePoolAddress(params);
  return new Pool({
    ...params,
    address: poolAddress,
    sqrtPriceX96,
    liquidity,
    tickCurrent,
  });
};

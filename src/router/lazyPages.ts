import React, { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { handleRecoilInit } from '@utils/recoilUtils';

type Factory = () => Promise<{ default: ComponentType<any> }>;
const lazyWithPreload = (factory: Factory) => {
  const Component = lazy(factory) as LazyExoticComponent<React.ComponentType<any>> & { preload: Factory };
  Component.preload = factory;
  return Component;
};

export const FarmingPage = lazyWithPreload(() => import('@pages/Farming'));
export const StakingPage = lazyWithPreload(() => import('@pages/Staking'));
export const PoolPage = lazyWithPreload(() => import('@pages/Pool'));
export const PoolLiquidityItemPage = lazyWithPreload(() => import('@pages/Pool/LiquidityDetail'));
export const PoolAddLiquidityPage = lazyWithPreload(() => import('@pages/Pool/AddLiquidity'));
export const PoolIncreaseLiquidity = lazyWithPreload(() => import('@pages/Pool/IncreaseLiquidity'));
export const PoolRemoveLiquidity = lazyWithPreload(() => import('@pages/Pool/RemoveLiquidity'));

(function () {
  const preLoadAll = () =>
    setTimeout(() => {
      FarmingPage.preload();
      StakingPage.preload();
      PoolPage.preload();
      PoolLiquidityItemPage.preload();
      PoolAddLiquidityPage.preload();
      PoolIncreaseLiquidity.preload();
      PoolRemoveLiquidity.preload();
    }, 500);

  try {
    handleRecoilInit(() => {
      preLoadAll();
    });
  } catch (_) {
    preLoadAll();
  }
})();

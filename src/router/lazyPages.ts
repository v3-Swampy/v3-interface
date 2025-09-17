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
export const PointsPage = lazyWithPreload(() => import('@pages/Points'));
export const LeaderBoardPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard'));
export const FRankPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard/FRank'));
export const WRankPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard/WRank'));
export const EarnPointsPage = lazyWithPreload(() => import('@pages/Points/EarnPoints'));

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
      PointsPage.preload();
      LeaderBoardPage.preload();
      FRankPage.preload();
      WRankPage.preload();
      EarnPointsPage.preload();
    }, 2000);

  try {
    handleRecoilInit(() => {
      preLoadAll();
    });
  } catch (_) {
    preLoadAll();
  }
})();

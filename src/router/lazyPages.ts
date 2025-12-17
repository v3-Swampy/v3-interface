import React, { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { handleRecoilInit } from '@utils/recoilUtils';

type Factory = () => Promise<{ default: ComponentType<any> }>;
const lazyWithPreload = (factory: Factory) => {
  const Component = lazy(factory) as LazyExoticComponent<React.ComponentType<any>> & { preload: Factory };
  Component.preload = factory;
  return Component;
};

export const EarnPage = lazyWithPreload(() => import('@pages/Earn'));
export const EarnAllPoolsPage = lazyWithPreload(() => import('@pages/Earn/AllPools'));
export const EarnMyPositionsPage = lazyWithPreload(() => import('@pages/Earn/MyPositions'));
export const EarnPositionDetailPage = lazyWithPreload(() => import('@pages/Earn/LiquidityDetail'));
export const EarnAddLiquidityPage = lazyWithPreload(() => import('@pages/Earn/AddLiquidity'));
export const EarnIncreaseLiquidity = lazyWithPreload(() => import('@pages/Earn/IncreaseLiquidity'));
export const EarnRemoveLiquidity = lazyWithPreload(() => import('@pages/Earn/RemoveLiquidity'));
// export const StakingPage = lazyWithPreload(() => import('@pages/Staking'));
export const PointsPage = lazyWithPreload(() => import('@pages/Points'));
export const LeaderBoardPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard'));
export const FRankPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard/FRank'));
export const WRankPage = lazyWithPreload(() => import('@pages/Points/LeaderBoard/WRank'));
export const EarnPointsPage = lazyWithPreload(() => import('@pages/Points/EarnPoints'));
export const EarnPoolLiquidityItemPage = lazyWithPreload(() => import('@pages/Earn/LiquidityDetail'));
export const EarnPoolAddLiquidityPage = lazyWithPreload(() => import('@pages/Earn/AddLiquidity'));
export const EarnPoolIncreaseLiquidity = lazyWithPreload(() => import('@pages/Earn/IncreaseLiquidity'));
export const EarnPoolRemoveLiquidity = lazyWithPreload(() => import('@pages/Earn/RemoveLiquidity'));

(function () {
  const preLoadAll = () =>
    setTimeout(() => {
      EarnPage.preload();
      EarnAllPoolsPage.preload();
      EarnMyPositionsPage.preload();
      EarnPositionDetailPage.preload();
      EarnAddLiquidityPage.preload();
      EarnIncreaseLiquidity.preload();
      EarnRemoveLiquidity.preload();
      // StakingPage.preload();
      PointsPage.preload();
      LeaderBoardPage.preload();
      FRankPage.preload();
      WRankPage.preload();
      EarnPointsPage.preload();
      EarnPoolLiquidityItemPage.preload();
      EarnPoolAddLiquidityPage.preload();
      EarnPoolIncreaseLiquidity.preload();
      EarnPoolRemoveLiquidity.preload();
    }, 2000);

  try {
    handleRecoilInit(() => {
      preLoadAll();
    });
  } catch (_) {
    preLoadAll();
  }
})();

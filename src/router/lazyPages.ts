import React, { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { handleRecoilInit } from '@utils/recoilUtils';

type Factory = () => Promise<{ default: ComponentType<any> }>;
const lazyWithPreload = (factory: Factory) => {
  const Component = lazy(factory) as LazyExoticComponent<React.ComponentType<any>> & { preload: Factory };
  Component.preload = factory;
  return Component;
};

export const PoolPage = lazyWithPreload(() => import('@pages/Pool'));
export const FarmingPage = lazyWithPreload(() => import('@pages/Farming'));
export const StakingPage = lazyWithPreload(() => import('@pages/Staking'));

(function () {
  const preLoadAll = () => {
    PoolPage.preload();
    FarmingPage.preload();
    StakingPage.preload();
  };

  try {
    handleRecoilInit(() => {
      preLoadAll();
    });
  } catch (_) {
    preLoadAll();
  }
})();

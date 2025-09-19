import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import CustomScrollbar from 'custom-react-scrollbar';
import TopLevelErrorBoundary from '@modules/TopLevelErrorBoundary';
import Navbar, { FooterBar, BlockNumber } from '@modules/Navbar';
import Delay from '@components/Delay';
import Spin from '@components/Spin';
import { useSetMainScroller } from '@hooks/useMainScroller';
import SwapPage from '@pages/Swap';
import { PoolPage, PoolAddLiquidityPage, PoolLiquidityItemPage, FarmingPage, AllFarmsPage, MyFarmsPage, StakingPage, PoolIncreaseLiquidity, PoolRemoveLiquidity, PointsPage, LeaderBoardPage, FRankPage, WRankPage, EarnPointsPage } from './lazyPages';

export const routes = [
  {
    name: 'Swap',
    path: 'swap',
  },
  {
    name: 'Pool',
    path: 'pool',
  },
  {
    name: 'Farming',
    path: 'farming',
  },
  {
    name: 'Staking',
    path: 'staking',
  },
];

const AppRouter: React.FC = () => {
  return (
    <TopLevelErrorBoundary>
      <Routes>
        <Route path="/" element={<RouteWrapper />}>
          <Route path="swap" element={<SwapPage />} />
          <Route path="pool">
            <Route index element={<PoolPage />} />
            <Route path="add_liquidity" element={<PoolAddLiquidityPage />} />
            <Route path=":tokenId" element={<PoolLiquidityItemPage />} />
            <Route path="increase_liquidity/:tokenId" element={<PoolIncreaseLiquidity />} />
            <Route path="remove_liquidity/:tokenId" element={<PoolRemoveLiquidity />} />
          </Route>
          <Route path="farming" element={<FarmingPage />} >
            <Route path="all-farms" element={<AllFarmsPage />} />
            <Route path="my-farms" element={<MyFarmsPage />} />
            <Route path="/farming/*" element={<Navigate to="/farming/all-farms" replace />} />
            <Route path="/farming/" element={<Navigate to="/farming/all-farms" replace />} />
          </Route>
          <Route path="staking" element={<StakingPage />} />
          <Route path="points" element={<PointsPage />}>
            <Route path="leader-board" element={<LeaderBoardPage />}>
              <Route path="w-rank" element={<WRankPage />} />
              <Route path="f-rank" element={<FRankPage />} />
              <Route path="/points/leader-board/*" element={<Navigate to="/points/leader-board/w-rank" replace />} />
              <Route path="/points/leader-board/" element={<Navigate to="/points/leader-board/w-rank" replace />} />
            </Route>
            <Route path="earn-points" element={<EarnPointsPage />} />
            <Route path="/points/*" element={<Navigate to="/points/leader-board/w-rank" replace />} />
            <Route path="/points/" element={<Navigate to="/points/leader-board/w-rank" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="swap" />} />
          <Route path="/" element={<Navigate to="swap" />} />
        </Route>
      </Routes>
    </TopLevelErrorBoundary>
  );
};

const PageLevelLoading: React.FC = () => (
  <Delay>
    <Spin className="block mx-auto mt-180px text-40px" />
  </Delay>
);

const RouteWrapper: React.FC = () => {
  useSetMainScroller();

  return (
    <>
      <Navbar />
      <CustomScrollbar
        className="main-scroller"
        contentClassName="min-h-full !flex flex-col pb-40px"
        placeholder={undefined}
        onPointerEnterCapture={undefined}
        onPointerLeaveCapture={undefined}
      >
        <Suspense fallback={<PageLevelLoading />}>
          <Outlet />
          <BlockNumber />
        </Suspense>
      </CustomScrollbar>
      <FooterBar />
    </>
  );
};

export default AppRouter;

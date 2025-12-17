import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import CustomScrollbar from 'custom-react-scrollbar';
import TopLevelErrorBoundary from '@modules/TopLevelErrorBoundary';
import Navbar, { FooterBar, BlockNumber } from '@modules/Navbar';
import Delay from '@components/Delay';
import Spin from '@components/Spin';
import { useSetMainScroller } from '@hooks/useMainScroller';
import SwapPage from '@pages/Swap';
import { EarnRedirect, saveEarnPath } from './EarnRedirect';
import {
  // PoolPage,
  // PoolAddLiquidityPage,
  // PoolLiquidityItemPage,
  // PoolIncreaseLiquidity,
  // PoolRemoveLiquidity,
  // FarmingPage,
  // AllFarmsPage,
  // MyFarmsPage,
  // StakingPage,
  PointsPage,
  LeaderBoardPage,
  FRankPage,
  WRankPage,
  EarnPointsPage,
  EarnPage,
  EarnAllPoolsPage,
  EarnMyPositionsPage,
  EarnAddLiquidityPage,
  EarnRemoveLiquidity,
  EarnIncreaseLiquidity,
  EarnPositionDetailPage,
  EarnPoolLiquidityItemPage,
  EarnPoolAddLiquidityPage,
  EarnPoolIncreaseLiquidity,
  EarnPoolRemoveLiquidity,
} from './lazyPages';

export const routes = [
  {
    name: 'Swap',
    path: 'swap',
  },
  {
    name: 'Earn',
    path: 'earn',
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
          {/* <Route path="pool">
            <Route index element={<PoolPage />} />
            <Route path="add_liquidity" element={<PoolAddLiquidityPage />} />
            <Route path=":tokenId" element={<PoolLiquidityItemPage />} />
            <Route path="increase_liquidity/:tokenId" element={<PoolIncreaseLiquidity />} />
            <Route path="remove_liquidity/:tokenId" element={<PoolRemoveLiquidity />} />
          </Route>
          <Route path="farming" element={<FarmingPage />}>
            <Route path="all-farms" element={<AllFarmsPage />} />
            <Route path="my-farms" element={<MyFarmsPage />} />
            <Route path="/farming/*" element={<Navigate to="/farming/all-farms" replace />} />
            <Route path="/farming/" element={<Navigate to="/farming/all-farms" replace />} />
          </Route> */}
          <Route path="earn">
            <Route element={<EarnPage />}>
              <Route path="all-pools" element={<EarnAllPoolsPage />} />
              <Route path="my-positions" element={<EarnMyPositionsPage />} />
            </Route>
            <Route path="my-positions/:tokenId" element={<EarnPositionDetailPage />} />
            <Route path="add_liquidity" element={<EarnAddLiquidityPage />} />
            <Route path="increase_liquidity/:tokenId" element={<EarnIncreaseLiquidity />} />
            <Route path="remove_liquidity/:tokenId" element={<EarnRemoveLiquidity />} />
            <Route path="/earn/*" element={<EarnRedirect />} />
            <Route path="/earn/" element={<EarnRedirect />} />
          </Route>
          <Route path="earn/pool">
            <Route path="add_liquidity" element={<EarnPoolAddLiquidityPage />} />
            <Route path=":tokenId" element={<EarnPoolLiquidityItemPage />} />
            <Route path="increase_liquidity/:tokenId" element={<EarnPoolIncreaseLiquidity />} />
            <Route path="remove_liquidity/:tokenId" element={<EarnPoolRemoveLiquidity />} />
          </Route>
          {/* <Route path="staking" element={<StakingPage />} /> */}
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
  const location = useLocation();

  // 在路由层面统一监听并保存 Earn 路径
  useEffect(() => {
    saveEarnPath(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      <CustomScrollbar
        className="main-scroller"
        contentClassName="min-h-full !flex flex-col md:pb-40px lt-md:pb-100px lt-mobile:pb-64px"
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

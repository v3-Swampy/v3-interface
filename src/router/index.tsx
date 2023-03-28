import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import CustomScrollbar from 'custom-react-scrollbar';
import TopLevelErrorBoundary from '@modules/TopLevelErrorBoundary';
import Navbar, { FooterBar } from '@modules/Navbar';
import Delay from '@components/Delay';
import Spin from '@components/Spin';
import { useSetMainScroller } from '@hooks/useMainScroller';
import SwapPage from '@pages/Swap';
import { PoolPage, FarmingPage, StakingPage } from './lazyPages';

export const routes = [
  {
    name: 'Swap',
    path: 'swap',
    element: SwapPage,
  },
  {
    name: 'Pool',
    path: 'pool',
    element: PoolPage,
  },
  {
    name: 'Farming',
    path: 'farming',
    element: FarmingPage,
  },
  {
    name: 'Staking',
    path: 'staking',
    element: StakingPage,
  },
];

const AppRouter: React.FC = () => {
  return (
    <Router>
      <TopLevelErrorBoundary>
        <Routes>
          <Route path="/" element={<RouteWrapper />}>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element ? <route.element /> : null} />
            ))}
            <Route path="*" element={<Navigate to="swap" />} />
            <Route path="/" element={<Navigate to="swap" />} />
          </Route>
        </Routes>
      </TopLevelErrorBoundary>
    </Router>
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
      <CustomScrollbar className="main-scroller" contentClassName="min-h-full !flex flex-col pb-40px">
        <Suspense fallback={<PageLevelLoading />}>
          <Outlet />
        </Suspense>
      </CustomScrollbar>
      <FooterBar />
    </>
  );
};

export default AppRouter;

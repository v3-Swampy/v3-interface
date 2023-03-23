import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import CustomScrollbar from 'custom-react-scrollbar';
import ErrorBoundary from '@modules/ErrorBoundary';
import Navbar from '@modules/Navbar';
import SwapPage from '@pages/Swap';
import { useSetMainScroller } from '@hooks/useMainScroller';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<RouteWrapper />}>
            <Route path="swap" element={<SwapPage />} />
            <Route path="*" element={<Navigate to="swap" />} />
            <Route path="/" element={<Navigate to="swap" />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

const RouteWrapper: React.FC = () => {
  useSetMainScroller();

  return (
    <>
      <Navbar />
      <CustomScrollbar className="main-scroller" contentClassName="min-h-full !flex flex-col pb-40px">
        <Outlet />
      </CustomScrollbar>
    </>
  );
};

export default AppRouter;

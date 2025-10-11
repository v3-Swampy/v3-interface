import React from 'react';
import cx from 'clsx';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import { NavLink, Outlet } from 'react-router-dom';

const PointsPage: React.FC = () => {
  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px">
      <div className="mx-auto max-w-800px">
        <NavLink to="/points/leader-board" className={({ isActive }) => cx('no-underline text-24px font-medium', isActive ? 'text-orange-normal' : 'text-gray-normal')}>
          Leader Board
        </NavLink>
        <NavLink to="/points/earn-points" className={({ isActive }) => cx('ml-24px no-underline text-24px font-medium', isActive ? 'text-orange-normal' : 'text-gray-normal')}>
          Earn Points
        </NavLink>

        <BorderBox className="mt-16px rounded-7 lt-mobile:rounded-4 p-16px" variant="gradient-white">
          <Outlet />
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default PointsPage;

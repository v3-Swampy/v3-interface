import React, { Suspense, useMemo } from 'react';
import cx from 'clsx';
import dayjs from 'dayjs';
import { NavLink, Outlet } from 'react-router-dom';
import Tooltip from '@components/Tooltip';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import { usePointRank } from '@service/points';
import Spin from '@components/Spin';
import Delay from '@components/Delay';

const linkClass = 'inline-flex justify-center items-center w-96px h-40px rounded-100px text-14px font-medium no-underline border-solid border-1px';
const linkNotActiveClass = 'bg-transparent border-gray-normal text-gray-normal hover:bg-orange-light-hover hover:border-orange-light';
const linkActiveClass = 'bg-orange-light border-orange-light text-orange-normal pointer-events-none';

const LastUpdated = () => {
  const { updatedAt } = usePointRank(20, 'trade');
  const updatedAtFormatted = useMemo(() => (!updatedAt ? undefined : dayjs(updatedAt * 1000).format('YYYY-MM-DD HH:mm:ss')), [updatedAt]);
  return (
    <span className="mobile:ml-auto self-end text-14px lt-sm:text-12px text-gray-normal font-medium whitespace-nowrap lt-mobile:mt-16px">
      Last Updated: {updatedAtFormatted}
      <Tooltip text="Data updates hourly">
        <span className="w-12px h-12px ml-6px">
          <InfoIcon className="w-12px h-12px lt-mobile:translate-y-2px" />
        </span>
      </Tooltip>
    </span>
  );
};

const LeaderBoard: React.FC = () => {
  return (
    <>
      <div className="flex items-center lt-mobile:flex-wrap">
        <NavLink to="/points/leader-board/w-rank" className={({ isActive }) => cx(linkClass, isActive ? linkActiveClass : linkNotActiveClass)}>
          W Rank
        </NavLink>
        <NavLink to="/points/leader-board/f-rank" className={({ isActive }) => cx(linkClass, isActive ? linkActiveClass : linkNotActiveClass, 'ml-8px')}>
          F Rank
        </NavLink>

        <Suspense fallback={null}>
          <LastUpdated />
        </Suspense>
      </div>

      <div className="mt-24px flex flex-col gap-24px lt-md:mt-16px lt-md:gap-16px">
        <Suspense
          fallback={
            <Delay delay={333}>
              <Spin className="!block mx-auto text-60px" />
            </Delay>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </>
  );
};

export default LeaderBoard;

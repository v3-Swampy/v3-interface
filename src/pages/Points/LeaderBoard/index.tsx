import React from 'react';
import cx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';
import { UserData } from './fetchData';
import BorderBox from '@components/Box/BorderBox';
import Avatar from '@components/Avatar';
import Address from '@modules/Address';
import { ReactComponent as RankIcon } from '@assets/icons/rank.svg';
import { UseWatchProps } from 'react-hook-form';

const linkClass = 'inline-flex justify-center items-center w-96px h-40px rounded-100px text-14px font-medium no-underline border-solid border-1px';
const linkNotActiveClass = 'bg-transparent border-gray-normal text-gray-normal hover:bg-orange-light-hover hover:border-orange-light';
const linkActiveClass = 'bg-orange-light border-orange-light text-orange-normal pointer-events-none';

export const RankItem: React.FC<UserData> = ({ account, wPoints, fPoints, isMy, ranking }) => {
  return (
    <BorderBox
      className="
        sm:h-84px lt-sm:py-24px px-32px lt-sm:px-8px lt-sm:gap-16px
        grid grid-cols-[1.5fr_1fr_1fr] lt-sm:grid-cols-2 items-center rounded-16px
      "
      variant={isMy ? 'gradient-white' : 'orange-light-hover'}
    >
      <div className="flex flex-col items-start gap-5px lt-sm:col-span-2">
        <span className={cx('text-12px text-gray-normal', isMy ? 'opacity-100' : 'opacity-0')}>My Points</span>
        <div className="flex items-center">
          <span className="w-24px h-24px flex justify-center items-center mr-4px text-14px font-medium text-gray-normal">
            {typeof ranking === 'number' && ranking <= 3 && (
              <RankIcon className="w-24px h-24px -translate-y-1px" color={ranking === 1 ? '#FFC501' : ranking === 2 ? '#A5B6B7' : '#EF833A'} />
            )}
            {typeof ranking === 'number' && ranking > 3 && `${ranking}`}
            {typeof ranking !== 'number' && '-'}
          </span>
          {!!account ? <Avatar account={account} size={24} className="mr-8px" /> : null}
          {!!account ? <Address address={account} className="text-14px text-black-normal font-normal" useTooltip />: null}
        </div>
      </div>
      <div className="flex flex-col items-start gap-5px">
        <span className="text-12px text-gray-normal">W Points</span>
        <span className="text-14px text-black-normal font-medium">{wPoints ?? '-'}</span>
      </div>
      <div className="flex flex-col items-start gap-5px border-0 lt-sm:border-l-2px lt-sm:border-solid lt-sm:border-orange-light lt-sm:pl-8px">
        <span className="text-12px text-gray-normal">F Points</span>
        <span className="text-14px text-black-normal font-medium">{fPoints ?? '-'}</span>
      </div>
    </BorderBox>
  );
};

const LeaderBoard: React.FC = () => {
  return (
    <>
      <NavLink to="/points/leader-board/w-rank" className={({ isActive }) => cx(linkClass, isActive ? linkActiveClass : linkNotActiveClass)}>
        W Rank
      </NavLink>
      <NavLink to="/points/leader-board/f-rank" className={({ isActive }) => cx(linkClass, isActive ? linkActiveClass : linkNotActiveClass, 'ml-8px')}>
        F Rank
      </NavLink>

      <div className="mt-24px flex flex-col gap-24px lt-md:mt-16px lt-md:gap-16px">
        <Outlet />
      </div>
    </>
  );
};

export default LeaderBoard;

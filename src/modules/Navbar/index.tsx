import React from 'react';
import { NavLink } from 'react-router-dom';
import cx from 'clsx';
import { useAccount } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import { ReactComponent as Logo } from '@assets/icons/logo.svg';
import { ReactComponent as ConfluxLogo } from '@assets/icons/conflux.svg';
import { useMainScrollerDistance } from '@hooks/useMainScroller';
import { routes } from '@router/index';
import { useRefreshPositions } from '@service/position';
import AccountDetailDropdown from './/AccountDetailDropdown';
import './index.css';

const Navbar: React.FC = () => {
  const account = useAccount();
  const mainScrollerDistance = useMainScrollerDistance();

  return (
    <header
      className={cx(
        'relative flex flex-col justify-center items-center h-80px text-grey-normal whitespace-nowrap z-100 lt-md:h-72px transition-colors',
        mainScrollerDistance > 1 && 'bg-#FFFDFA'
      )}
    >
      <nav className="flex items-center w-full xl:max-w-1232px lt-xl:px-24px lt-md:px-12px lt-tiny:px-6px">
        <NavLink to="/swap" style={({ isActive }) => ({ pointerEvents: isActive ? 'none' : undefined })}>
          <Logo className="w-130px h-80px flex-shrink-0 lt-md:w-90px lt-md:h-55px" />
        </NavLink>

        <div className="ml-58px inline-flex items-center gap-32px lt-md:display-none">
          <NavLinks />
        </div>

        <div className="flex-shrink-0 ml-auto mr-16px flex justify-center items-center w-156px h-40px rounded-100px text-14px text-black-normal font-medium bg-orange-light-hover">
          <span className="breathing-light" />
          <ConfluxLogo className="w-24px h-24px mx-4px" />
          Conflux eSpace
        </div>

        <AuthConnectButton className="flex-shrink-0 min-w-140px h-40px px-8px rounded-100px" color="gradient">
          {account && <AccountDetailDropdown account={account} />}
        </AuthConnectButton>
      </nav>
    </header>
  );
};

const NavLinks: React.FC = () => {
  const refreshPositions = useRefreshPositions();

  return (
    <>
      {routes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) => cx('text-16px font-medium no-underline', isActive ? 'router-link-active' : 'router-link-inactive')}
          style={({ isActive }) => ({ color: isActive ? '#E14E28' : '#222222' })}
        >
          <span
            onClick={() => {
              if (route.path === 'pool') {
                refreshPositions();
              }
            }}
          >
            {route.name}
          </span>
        </NavLink>
      ))}
    </>
  );
};

export const FooterBar: React.FC = () => {
  return (
    <footer className="md:display-none fixed bottom-0 w-full h-60px border-0px border-t-1px border-solid border-gray-normal">
      <div className="w-full h-full inline-flex justify-evenly items-center">
        <NavLinks />
      </div>
    </footer>
  );
};

export default Navbar;

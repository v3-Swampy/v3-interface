import React from 'react';
import { NavLink } from 'react-router-dom';
import cx from 'clsx';
import { useAccount } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import { ReactComponent as Logo } from '@assets/icons/logo.svg';
import { ReactComponent as ConfluxLogo } from '@assets/icons/conflux.svg';
import { useMainScrollerDistance } from '@hooks/useMainScroller';
import { routes } from '@router/index';
import AccountDetailDropdown from './/AccountDetailDropdown';
import './index.css';

const Navbar: React.FC = () => {
  const account = useAccount();
  const mainScrollerDistance = useMainScrollerDistance();

  return (
    <header
      className={cx(
        'relative flex flex-col justify-center items-center h-104px text-grey-normal whitespace-nowrap z-100 lt-md:h-72px transition-colors',
        mainScrollerDistance > 1 && 'bg-#110F1B'
      )}
    >
      <nav className="flex items-center w-full xl:max-w-1232px lt-xl:px-24px lt-md:px-12px lt-tiny:px-6px">
        <Logo className="w-96px h-45px flex-shrink-0 lt-md:w-68px lt-md:h-32px -translate-y-12px lt-md:-translate-y-4px" />

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

const NavLinks = () => (
  <>
    {routes.map((route) => (
      <NavLink
        key={route.path}
        to={route.path}
        className="text-16px font-medium no-underline"
        style={({ isActive }) => ({ pointerEvents: isActive ? 'none' : undefined, color: isActive ? '#E14E28' : '#225050' })}
      >
        {route.name}
      </NavLink>
    ))}
  </>
);

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

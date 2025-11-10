import React from 'react';
import { NavLink } from 'react-router-dom';
import cx from 'clsx';
import { useAccount } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import { ReactComponent as Logo } from '@assets/icons/logo.svg';
import { ReactComponent as WLogo } from '@assets/icons/WallFree X-logo.svg';
import { ReactComponent as SmallLogo } from '@assets/icons/logo_icon.svg';
import { ReactComponent as WSmallLogo } from '@assets/icons/WallFree X-logo-small.svg';
import { ReactComponent as ConfluxLogo } from '@assets/icons/conflux.svg';
import { ReactComponent as WIcon } from '@assets/icons/w_point.svg';
import { ReactComponent as FIcon } from '@assets/icons/f_point.svg';
import { useMainScrollerDistance } from '@hooks/useMainScroller';
import BorderBox from '@components/Box/BorderBox';
import { routes } from '@router/index';
export { default as BlockNumber } from '@modules/Navbar/BlockNumber';
import AccountDetailDropdown from './AccountDetailDropdown';
import './index.css';

const Navbar: React.FC = () => {
  const account = useAccount();
  const mainScrollerDistance = useMainScrollerDistance();

  const isWallfreex = React.useMemo(() => {
    const currentUrl = window.location.href;
    return currentUrl.includes('wallfreex');
  }, []);

  return (
    <header
      className={cx(
        'relative flex flex-col justify-center items-center h-80px text-gray-normal whitespace-nowrap z-100 lt-mobile:h-48px transition-colors',
        mainScrollerDistance > 1 && 'bg-#FFFDFA'
      )}
    >
      <nav className="relative flex items-center w-full xl:max-w-1232px lt-xl:px-24px lt-md:px-12px lt-tiny:px-6px">
        <NavLink to="/swap" style={({ isActive }) => ({ pointerEvents: isActive ? 'none' : undefined })} className="lt-mobile:h-24px">
          {isWallfreex ? <WSmallLogo className="mobile:display-none w-fit h-24px flex-shrink-0" /> : <SmallLogo className="mobile:display-none w-24px h-24px flex-shrink-0" />}
          {isWallfreex ? (
            <WLogo className="lt-mobile:display-none w-fit h-80px flex-shrink-0 t-md:h-55px" />
          ) : (
            <Logo className="lt-mobile:display-none w-fit h-80px flex-shrink-0 lt-md:h-55px" />
          )}
        </NavLink>

        <div className={cx('inline-flex items-center gap-32px lt-lg:gap-16px lt-md:display-none', isWallfreex ? 'ml-32px' : 'ml-58px')}>
          <NavLinks />
        </div>

        <NavLink to="/points" className="ml-auto flex-shrink-0 mr-12px lt-sm:mr-8px no-underline">
          <BorderBox className="flex justify-center items-center mobile:px-8px h-[40px] rounded-100px lt-mobile:border-none! lt-mobile:bg-none!" variant="gradient-white">
            <WIcon className="w-24px h-24px" />
            <FIcon className="-ml-4px w-24px h-24px" />

            <span className="ml-[4px] text-14px text-gradient-orange lt-mobile:hidden">Earn points</span>
          </BorderBox>
        </NavLink>

        <div className="flex-shrink-0 mr-16px flex justify-center items-center lg:w-156px px-[8px] h-40px text-14px rounded-100px text-14px text-black-normal font-normal bg-orange-light-hover lt-mobile:w-auto lt-mobile:!bg-transparent lt-mobile:mr-0 lt-mobile:h-24px lt-mobile:w-24px">
          <span className="breathing-light" />
          <ConfluxLogo className="w-24px h-24px mx-4px" />
          <span className="lt-lg:hidden">Conflux eSpace</span>
        </div>

        <AuthConnectButton className="flex-shrink-0 min-w-144px h-40px text-14px px-8px rounded-100px" color="gradient">
          {account && <AccountDetailDropdown account={account} />}
        </AuthConnectButton>
      </nav>
    </header>
  );
};

const NavLinks: React.FC = () => {

  const isWallfreexMainnet = React.useMemo(() => {
    const currentUrl = window.location.href;
    return currentUrl.includes('wallfreex') && !currentUrl.includes('test');
  }, []);

  return (
    <>
      {routes
        .filter((route) => {
          // Hide farming and staking routes when URL includes 'wallfreex' and on conflux mainnet
          if (isWallfreexMainnet && (route.path === 'farming' || route.path === 'staking')) {
            return false;
          }
          return true;
        })
        .map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) => cx('text-16px font-normal no-underline', isActive ? 'router-link-active' : 'router-link-inactive')}
            style={({ isActive }) => ({ color: isActive ? '#E14E28' : '#222222' })}
          >
            <span>{route.name}</span>
          </NavLink>
        ))}
    </>
  );
};

export const FooterBar: React.FC = () => {
  return (
    <footer className="md:display-none fixed bottom-0 w-full h-60px border-0px border-t-1px border-solid border-#D9D9D9">
      <div className="w-full h-full inline-flex justify-evenly items-center bg-white-normal">
        <NavLinks />
      </div>
    </footer>
  );
};

export default Navbar;

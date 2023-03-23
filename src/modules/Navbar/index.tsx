import React from 'react';
import { NavLink } from 'react-router-dom';
import cx from 'clsx';
import { useAccount } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import Address from '@modules/Address';
import { useMainScrollerDistance } from '@hooks/useMainScroller';
import { ReactComponent as Logo } from '@assets/icons/logo.svg';

const Navbar: React.FC = () => {
  const account = useAccount();
  const mainScrollerDistance = useMainScrollerDistance();

  return (
    <header
      className={cx(
        'relative flex flex-col justify-center items-center h-116px text-grey-normal whitespace-nowrap z-100 lt-md:h-80px transition-colors',
        mainScrollerDistance > 1 && 'bg-#110F1B'
      )}
    >
      <nav className="flex items-center w-full xl:max-w-1232px lt-xl:px-24px lt-md:px-12px lt-tiny:px-6px">
        <NavLink to="/" className="mr-auto flex items-center text-grey-normal no-underline" style={({ isActive }) => ({ pointerEvents: isActive ? 'none' : undefined })}>
          <Logo className="w-54px h-54px flex-shrink-0 lt-md:w-32px lt-md:h-32px" />
        </NavLink>

        <AuthConnectButton>
          {account && (
            <>
              <Address address={account} className="mr-10px text-16px text-#AAA9C1 leading-18px" />
            </>
          )}
        </AuthConnectButton>
      </nav>
    </header>
  );
};

export default Navbar;

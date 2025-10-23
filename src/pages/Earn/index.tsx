import React from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import useI18n from '@hooks/useI18n';
import { Suspense } from 'react';
import Spin from '@components/Spin';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '@components/Button';
import { ReactComponent as AddIcon } from '@assets/icons/add.svg';
import BorderBox from '@components/Box/BorderBox';

const transitions = {
  en: {
    earn: 'Earn',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    myPositions: 'My Positions',
    allPools: 'All Pools',
    new_positions: 'New Positions',
  },
  zh: {
    earn: '挖矿',
    desc: 'Concentrated and effective liquidity providers will get more rewards.',
    myPositions: 'My Positions',
    allPools: 'All Pools',
    new_positions: '新仓位',
  },
} as const;

const EarnPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const buttonClass =
    'inline-block no-underline py-10px leading-18px px-6 rounded-full text-center text-sm font-normal border border-solid text-gray-normal box-border cursor-pointer';
  const buttonClassActive = 'bg-orange-light !text-orange-normal border border-solid border-orange-light';

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px">
      <div className="mx-auto max-w-800px">
        <div className="flex justify-start items-end pl-16px mb-16px lt-mobile:pl-0 lt-mobile:flex-col lt-mobile:items-start">
          <div className="flex-1 flex gap-20px items-end">
            <div className="leading-30px text-24px text-orange-normal font-normal lt-mobile:text-18px lt-mobile:leading-23px">{i18n.earn}</div>
            <div className="font-normal text-14px leading-18px mb-2px color-gray-normal lt-mobile:text-12px lt-mobile:leading-15px lt-mobile:ml-0 lt-mobile:mt-6.5px lt-mobile:w-246px">
              {i18n.desc}
            </div>
          </div>
          <Link to="/pool/add_liquidity" className="no-underline shrink-0">
            <Button color="gradient" className="px-24px h-40px text-14px rounded-100px" id="pool-add-new-position">
              <AddIcon className="mr-8px w-12px h-12px" />
              {i18n.new_positions}
            </Button>
          </Link>
        </div>

        <BorderBox className="relative w-full p-16px pt-24px rounded-28px group lt-mobile:rounded-4" variant="gradient-white">
          <div className="flex justify-between lt-mobile:flex-col">
            <div>
              <NavLink to="/earn/my-positions" className={({ isActive }) => `${buttonClass} mr-2 ${isActive ? buttonClassActive : ''}`}>
                {i18n.myPositions}
              </NavLink>
              <NavLink to="/earn/all-pools" className={({ isActive }) => `${buttonClass} ${isActive ? buttonClassActive : ''}`} end>
                {i18n.allPools}
              </NavLink>
            </div>
          </div>
          <Suspense fallback={<Spin className="!block mx-auto text-60px mt-4" />}>
            <Outlet />
          </Suspense>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default EarnPage;

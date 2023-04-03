import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Settings from '@modules/Settings';
import showTokenSelectModal from '@modules/TokenSelectModal';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    add_liquidity: 'Add Liquidity',
    clear_all: 'Clear All',
    select_pair: 'Select Pair',
    select_token: 'Select token',
  },
  zh: {
    add_liquidity: '添加流动性',
    clear_all: '清除设置',
    select_pair: '选择币对',
    select_token: '选择代币',
  },
} as const;

const PoolPage: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px ">
        <div className="relative flex items-center pl-16px pr-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          <span className="i-material-symbols:keyboard-arrow-left absolute -left-10px translate-y-1px text-24px text-gray-normal" />
          <Link to="/pool" className="mr-auto inline-flex items-center no-underline text-orange-normal">
            {i18n.add_liquidity}
          </Link>

          <Button color="orange" variant="text" className="mr-4px px-10px h-40px rounded-100px">
            {i18n.clear_all}
          </Button>
          <Settings />
        </div>
        <BorderBox className="relative w-full p-16px rounded-28px flex gap-32px lt-md:gap-16px" variant="gradient-white">
          <div className="w-310px flex-grow-1 flex-shrink-1">
            <p className="mt-16px mb-8px leading-18px text-14px text-black-normal font-medium">Select Pair</p>

            <div className="flex gap-10px">
              <Button
                className="!flex-shrink-1 w-50% h-40px rounded-100px"
                color="gradient"
                onClick={() => showTokenSelectModal({ currentSelectToken: null, onSelect: (token) => {} })}
              >
                {i18n.select_token} <span className="i-ic:sharp-keyboard-arrow-down ml-24px flex-shrink-0 text-16px font-medium" />
              </Button>
              <Button
                className="!flex-shrink-1 w-50% h-40px rounded-100px"
                color="gradient"
                onClick={() => showTokenSelectModal({ currentSelectToken: null, onSelect: (token) => {} })}
              >
                {i18n.select_token} <span className="i-ic:sharp-keyboard-arrow-down ml-24px flex-shrink-0 text-16px font-medium" />
              </Button>
            </div>
          </div>

          <div className="w-426px flex-grow-1 flex-shrink-1"></div>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default PoolPage;

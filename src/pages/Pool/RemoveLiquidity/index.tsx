import React, { useCallback } from 'react';
import { atom, useRecoilState } from 'recoil';
import { persistAtom } from '@utils/recoilUtils';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';

const transitions = {
  en: {
    remove_liquidity: 'Remove Liquidity',
    enter_percent: 'Enter a percent',
    remove: 'Remove',
  },
  zh: {
    remove_liquidity: '去除流动性',
    enter_percent: '输入百分比',
    remove: '去除'
  },
} as const;

const tokenAState = atom<Token | null>({
  key: `pool-tokenAState-${import.meta.env.MODE}`,
  default: null,
  effects: [persistAtom],
});

const tokenBState = atom<Token | null>({
  key: `pool-tokenBState-${import.meta.env.MODE}`,
  default: null,
  effects: [persistAtom],
});

const RemoveLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, watch } = useForm();


  const onSubmit = useCallback(
    withForm(async (data) => {
      console.log(data);
    }),
    []
  );

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px ">
        <div className="relative flex items-center pl-16px pr-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          <span className="i-material-symbols:keyboard-arrow-left absolute -left-10px translate-y-1px text-24px text-gray-normal" />
          <Link to="/pool" className="mr-auto inline-flex items-center no-underline text-orange-normal">
            {i18n.remove_liquidity}
          </Link>
          <Settings />
        </div>
        <form onSubmit={onSubmit}>
          <BorderBox className="relative w-full p-16px rounded-28px flex gap-32px lt-md:gap-16px" variant="gradient-white">
            <div className="w-310px flex-grow-1 flex-shrink-1">
            </div>

            <div className="w-426px flex-grow-1 flex-shrink-1"></div>
          </BorderBox>
        </form>
      </div>
    </PageWrapper>
  );
};

export default RemoveLiquidity;

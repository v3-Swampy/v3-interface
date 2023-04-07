import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import { addLiquidity } from '@service/pool-manage';
import SelectPair, { useTokenA, useTokenB } from './SelectPair';
import SelectFeeTier from './SelectFeeTier';
import DepositAmounts from './DepositAmounts';
import SetPriceRange from './SetPriceRange';
import SubmitButton from './SubmitButton';
import './index.css';

const transitions = {
  en: {
    add_liquidity: 'Add Liquidity',
    clear_all: 'Clear All',
  },
  zh: {
    add_liquidity: '添加流动性',
    clear_all: '清除设置',
  },
} as const;

const AddLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();

  const tokenA = useTokenA();
  const tokenB = useTokenB();
  const priceLower = watch('price-lower', '');
  const priceUpper = watch('price-upper', '');
  /** null means range not input */
  const isRangeValid = useMemo(() => {
    try {
      return priceLower && priceUpper
        ? Unit.fromMinUnit(priceUpper).greaterThan(Unit.fromMinUnit(0))
          ? Unit.fromMinUnit(priceLower).lessThan(Unit.fromMinUnit(priceUpper))
          : true
        : null;
    } catch {
      return null;
    }
  }, [priceLower, priceUpper]);

  const amountTokenA = watch('amount-tokenA', '');
  const amountTokenB = watch('amount-tokenB', '');
  const priceInit = watch('price-init', '');

  const onSubmit = useCallback(
    withForm(async (data) => {
      if (!tokenA || !tokenB) return;
      addLiquidity({
        ...(data as unknown as { 'amount-tokenA': string; 'amount-tokenB': string; fee: string; 'price-init': string; 'price-lower': string; 'price-upper': string }),
        tokenA,
        tokenB,
      });
    }),
    [tokenA, tokenB]
  );

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
        <form onSubmit={onSubmit}>
          <BorderBox className="relative w-full p-16px rounded-28px flex gap-32px lt-md:gap-16px" variant="gradient-white">
            <div className="w-310px flex-grow-1 flex-shrink-1">
              <SelectPair />
              <SelectFeeTier register={register} />
              <DepositAmounts register={register} setValue={setValue} getValues={getValues} isRangeValid={isRangeValid} priceInit={priceInit} />
            </div>

            <div className="w-426px flex-grow-1 flex-shrink-1 flex flex-col justify-between">
              <SetPriceRange register={register} setValue={setValue} isRangeValid={isRangeValid} priceInit={priceInit} priceUpper={priceUpper}/>

              <SubmitButton amountTokenA={amountTokenA} amountTokenB={amountTokenB} />
            </div>
          </BorderBox>
        </form>
      </div>
    </PageWrapper>
  );
};

export default AddLiquidity;

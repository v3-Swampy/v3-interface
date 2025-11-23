import React, { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import useInTransaction from '@hooks/useInTransaction';
import { handleClickSubmitCreatePosition as _handleClickSubmitCreatePosition } from '@service/earn';
import SelectPair, { useTokenA, useTokenB, swapTokenAB, resetToken } from './SelectPair';
import DepositAmounts from '@modules/Position/DepositAmounts';
import { ReactComponent as ArrowLeftIcon } from '@assets/icons/arrow_left.svg';
import { ReactComponent as ClearIcon } from '@assets/icons/clear.svg';
import SelectFeeTier, { useCurrentFee } from './SelectFeeTier';
import SetPriceRange from './SetPriceRange';
import SubmitButton from './SubmitButton';
import ExpectedReward from './ExpectedReward';
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
  const navigate = useNavigate();
  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();

  const currentFee = useCurrentFee();
  const tokenA = useTokenA();
  const tokenB = useTokenB();
  const token0 = tokenA && tokenB ? (tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? tokenA : tokenB) : null;
  const token1 = tokenA && tokenB ? (tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? tokenB : tokenA) : null;

  const priceLower = watch('price-lower', '') as string;
  const priceUpper = watch('price-upper', '') as string;

  /** null means range not input */
  const isRangeValid = useMemo(() => {
    try {
      return priceLower && priceUpper ? (new Unit(priceUpper).greaterThan(new Unit(0)) ? new Unit(priceLower).lessThan(new Unit(priceUpper)) : true) : null;
    } catch {
      return null;
    }
  }, [priceLower, priceUpper]);

  const amountTokenA = watch('amount-tokenA', '') as string;
  const amountTokenB = watch('amount-tokenB', '') as string;
  const priceInit = watch('price-init', '') as string;

  const handleSwapToken = useCallback(() => {
    if (!swapTokenAB()) return;
    const values = getValues();
    const priceLower = values['price-lower'];
    const priceUpper = values['price-upper'];
    const priceInit = values['price-init'];

    setTimeout(() => {
      if (priceInit) {
        setValue('price-init', (1 / +priceInit).toFixed(5));
      }

      if (priceLower) {
        const isPriceLowerZero = new Unit(priceLower).equals(new Unit(0));
        if (!isPriceLowerZero) {
          setValue('price-upper', (1 / priceLower).toFixed(5));
        } else {
          setValue('price-upper', 'Infinity');
        }
      } else {
        setValue('price-upper', '');
      }

      if (priceUpper) {
        const isPriceUpperInfinity = priceUpper === 'Infinity';
        if (!isPriceUpperInfinity) {
          setValue('price-lower', (1 / priceUpper).toFixed(5));
        } else {
          setValue('price-lower', '0');
        }
      } else {
        setValue('price-lower', '');
      }
      setTimeout(() => {
        setValue('amount-tokenB', '');
        setValue('amount-tokenA', '');
      });
    });
  }, []);

  const { inTransaction: inSubmitCreate, execTransaction: handleClickSubmitCreatePosition } = useInTransaction(_handleClickSubmitCreatePosition);
  const onSubmit = useCallback(
    withForm(async (data) => {
      if (!tokenA || !tokenB) return;
      handleClickSubmitCreatePosition({
        ...(data as unknown as { 'amount-tokenA': string; 'amount-tokenB': string; 'price-init': string; 'price-lower': string; 'price-upper': string }),
        fee: currentFee,
        tokenA,
        tokenB,
        priceInit,
        navigate,
      });
    }),
    [tokenA, tokenB, priceInit, currentFee]
  );

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px lt-md:pb-60px">
      <div className="mx-auto max-w-800px">
        <div className="mb-16px lt-mobile:mb-12px flex items-center h-40px pl-8px pr-16px text-24px lt-mobile:text-18px text-orange-normal font-normal whitespace-nowrap">
          <Link to="/earn/all-pools" className="mr-auto inline-flex items-center no-underline text-orange-normal">
            <ArrowLeftIcon className="w-8px h-12px mr-16px lt-mobile:mr-12px" />
            {i18n.add_liquidity}
          </Link>

          <Button color="orange" variant="text" className="lt-mobile:display-none mr-4px px-10px h-40px rounded-100px" onClick={resetToken}>
            {i18n.clear_all}
          </Button>
          {token0 && token1 && (
            <div className="mobile:ml-4px mr-8px lt-mobile:mr-14px flex items-center h-28px px-2px rounded-4px bg-orange-light text-14px font-normal">
              <span
                className={cx(
                  'inline-block px-10px h-24px leading-24px cursor-pointer rounded-4px',
                  tokenA === token0 ? 'text-orange-normal bg-orange-light-hover pointer-events-none' : 'text-gray-normal'
                )}
                onClick={handleSwapToken}
              >
                {token0.symbol}
              </span>
              <span
                className={cx(
                  'inline-block px-10px h-24px leading-24px cursor-pointer rounded-4px',
                  tokenA === token1 ? 'text-orange-normal bg-orange-light-hover pointer-events-none' : 'text-gray-normal'
                )}
                onClick={handleSwapToken}
              >
                {token1.symbol}
              </span>
            </div>
          )}

          <ClearIcon className="mobile:display-none mr-12px w-16px h-16px cursor-pointer flex-shrink-0" onClick={resetToken} />
          <Settings />
        </div>
        <form onSubmit={onSubmit}>
          <BorderBox className="relative w-full p-16px rounded-28px flex lt-md:flex-wrap gap-32px lt-md:gap-16px" variant="gradient-white">
            <div className="w-310px lt-md:w-full flex-grow-1 flex-shrink-1">
              <SelectPair handleSwapToken={handleSwapToken} />
              <SelectFeeTier register={register} />
              <DepositAmounts
                register={register}
                setValue={setValue}
                getValues={getValues}
                isRangeValid={isRangeValid}
                priceInit={priceInit}
                priceLower={priceLower}
                priceUpper={priceUpper}
                tokenA={tokenA}
                tokenB={tokenB}
                fee={currentFee}
              />
            </div>

            <div className="w-426px lt-md:w-full flex-grow-1 flex-shrink-1 flex flex-col justify-between">
              <SetPriceRange
                register={register}
                setValue={setValue}
                getValues={getValues}
                isRangeValid={isRangeValid}
                priceInit={priceInit}
                priceLower={priceLower}
                priceUpper={priceUpper}
              />

              <ExpectedReward fee={currentFee} tokenA={tokenA!} tokenB={tokenB!} amountTokenA={amountTokenA} amountTokenB={amountTokenB} />

              <SubmitButton amountTokenA={amountTokenA} amountTokenB={amountTokenB} inSubmitCreate={inSubmitCreate} disabled={!tokenA || !tokenB || !isRangeValid} />
            </div>
          </BorderBox>
        </form>
      </div>
    </PageWrapper>
  );
};

export default AddLiquidity;

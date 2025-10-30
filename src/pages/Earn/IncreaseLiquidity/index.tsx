import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import useInTransaction from '@hooks/useInTransaction';
import Settings from '@modules/Settings';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import DepositAmounts from '@modules/Position/DepositAmounts';
import { usePosition, handleClickSubmitIncreasePositionLiquidity as _handleClickSubmitIncreasePositionLiquidity } from '@service/earn';
import { ReactComponent as ArrowLeftIcon } from '@assets/icons/arrow_left.svg';
import PairInfo from './PairInfo';
import SubmitButton from './SubmitButton';

const transitions = {
  en: {
    increase_liquidity: 'Increase Liquidity',
    add_more_Liquidity: 'Add more liquidity',
  },
  zh: {
    increase_liquidity: '增加流动性',
    add_more_Liquidity: 'Add more liquidity',
  },
} as const;

const IncreaseLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();
  const amountTokenA = watch('amount-tokenA', '') as string;
  const amountTokenB = watch('amount-tokenB', '') as string;

  const { tokenId } = useParams();

  const position = usePosition(Number(tokenId));
  const { leftToken, rightToken, fee, priceLower, priceUpper } = position ?? {};

  const { inTransaction: inSubmitCreate, execTransaction: handleClickSubmitIncreasePositionLiquidity } = useInTransaction(_handleClickSubmitIncreasePositionLiquidity);
  const onSubmit = useCallback(
    withForm(async (data) => {
      if (!position || !tokenId || !leftToken || !rightToken) return;
      handleClickSubmitIncreasePositionLiquidity({
        ...(data as unknown as { 'amount-tokenA': string; 'amount-tokenB': string; fee: string; 'price-init': string; 'price-lower': string; 'price-upper': string }),
        tokenId: Number(tokenId),
        tokenA: leftToken,
        tokenB: rightToken,
        position,
      });
    }),
    [position, tokenId, leftToken, rightToken]
  );

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px lt-md:pb-60px">
      <div className="mx-auto max-w-800px">
        <div className="mb-16px lt-mobile:mb-12px flex items-center h-40px pl-8px pr-16px text-24px lt-mobile:text-18px text-orange-normal font-normal whitespace-nowrap">
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline text-orange-normal">
            <ArrowLeftIcon className="w-8px h-12px mr-16px lt-mobile:mr-12px" />
            {i18n.increase_liquidity}
          </Link>
          <Settings />
        </div>
        <form onSubmit={onSubmit}>
          <BorderBox className="relative w-full p-16px pt-24px rounded-28px flex lt-md:flex-wrap gap-32px lt-md:gap-16px" variant="gradient-white">
            <div className="w-310px lt-md:w-full flex-grow-1 flex-shrink-1">
              <PairInfo position={position} />
              <DepositAmounts
                title={i18n.add_more_Liquidity}
                register={register}
                setValue={setValue}
                getValues={getValues}
                tokenA={leftToken}
                tokenB={rightToken}
                priceLower={priceLower}
                priceUpper={priceUpper}
                fee={fee}
                isRangeValid={true}
              />
            </div>
            <div className="w-426px flex-grow-1 flex-shrink-1 flex flex-col justify-between lt-md:w-full">
              <SelectedPriceRange position={position} tokenId={tokenId} />
              <SubmitButton amountTokenA={amountTokenA} amountTokenB={amountTokenB} inSubmitCreate={inSubmitCreate} tokenA={leftToken} tokenB={rightToken} />
            </div>
          </BorderBox>
        </form>
      </div>
    </PageWrapper>
  );
};

export default IncreaseLiquidity;

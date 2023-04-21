import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useInvertedState } from '@modules/Position/invertedState';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import useInTransaction from '@hooks/useInTransaction';
import Settings from '@modules/Settings';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import DepositAmounts from '@modules/Position/DepositAmounts';
import { invertPrice } from '@service/pairs&pool';
import { isTokenEqual } from '@service/tokens';
import { usePosition, handleClickSubmitIncreasePositionLiquidity as _handleClickSubmitIncreasePositionLiquidity } from '@service/position';
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
  const [inverted] = useInvertedState(tokenId);

  const position = usePosition(Number(tokenId));
  const { token0, leftToken, rightToken, fee, priceLower: _priceLower, priceUpper: _priceUpper } = position ?? {};
  const leftTokenForUI = !inverted ? leftToken : rightToken;
  const rightTokenForUI = !inverted ? rightToken : leftToken;
  const isLeftTokenEqualToken0 = isTokenEqual(leftTokenForUI, token0);
  const priceLower = isLeftTokenEqualToken0 ? _priceLower : invertPrice(_priceUpper);
  const priceUpper = isLeftTokenEqualToken0 ? _priceUpper : invertPrice(_priceLower);

  const { inTransaction: inSubmitCreate, execTransaction: handleClickSubmitIncreasePositionLiquidity } = useInTransaction(_handleClickSubmitIncreasePositionLiquidity);
  const onSubmit = useCallback(
    withForm(async (data) => {
      if (!position || !tokenId || !leftTokenForUI || !rightTokenForUI) return;
      handleClickSubmitIncreasePositionLiquidity({
        ...(data as unknown as { 'amount-tokenA': string; 'amount-tokenB': string; fee: string; 'price-init': string; 'price-lower': string; 'price-upper': string }),
        tokenId: Number(tokenId),
        tokenA: leftTokenForUI,
        tokenB: rightTokenForUI,
        position,
      });
    }),
    [position, tokenId, leftTokenForUI, rightTokenForUI]
  );

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="relative flex items-center pl-16px pr-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline text-orange-normal">
            <span className="i-material-symbols:keyboard-arrow-left absolute -left-10px translate-y-1px text-24px text-gray-normal" />
            {i18n.increase_liquidity}
          </Link>
          <Settings />
        </div>
        <form onSubmit={onSubmit}>
          <BorderBox className="w-full p-16px rounded-28px flex justify-between gap-32px lt-md:gap-12px" variant="gradient-white">
            <div className="max-w-310px mt-8px">
              <PairInfo position={position} />
              <DepositAmounts
                title={i18n.add_more_Liquidity}
                register={register}
                setValue={setValue}
                getValues={getValues}
                tokenA={leftTokenForUI}
                tokenB={rightTokenForUI}
                priceLower={priceLower}
                priceUpper={priceUpper}
                fee={fee}
                isRangeValid={true}
              />
            </div>
            <div className="mt-8px flex-1 flex flex-col justify-between">
              <SelectedPriceRange position={position} tokenId={tokenId} />
              <SubmitButton amountTokenA={amountTokenA} amountTokenB={amountTokenB} inSubmitCreate={inSubmitCreate} tokenA={leftTokenForUI} tokenB={rightTokenForUI} />
            </div>
          </BorderBox>
        </form>
      </div>
    </PageWrapper>
  );
};

export default IncreaseLiquidity;

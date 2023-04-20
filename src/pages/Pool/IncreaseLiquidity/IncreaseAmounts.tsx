import React from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { usePosition } from '@service/position';
import { invertPrice } from '@service/pairs&pool';
import { isTokenEqual } from '@service/tokens';
import DepositAmounts from '@modules/Position/DepositAmounts';
import { useInvertedState } from '@modules/Position/invertedState';

const transitions = {
  en: {
    addMoreLiquidity: 'Add more liquidity',
  },
  zh: {
    addMoreLiquidity: 'Add more liquidity',
  },
} as const;

const IncreaseAmounts: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, setValue, getValues } = useForm();
  const { tokenId } = useParams();
  const [inverted] = useInvertedState(tokenId);

  const position = usePosition(Number(tokenId));
  const { token0, leftToken, rightToken, fee, priceLower: _priceLower, priceUpper: _priceUpper } = position ?? {};
  const leftTokenForUI = !inverted ? leftToken : rightToken;
  const rightTokenForUI = !inverted ? rightToken : leftToken;

  const needInvertPrice = !isTokenEqual(token0, leftTokenForUI);
  const priceLower = needInvertPrice ? _priceLower : invertPrice(_priceUpper);
  const priceUpper = needInvertPrice ? _priceUpper : invertPrice(_priceLower);

  console.log(priceLower?.toDecimalMinUnit(5), priceUpper?.toDecimalMinUnit(5));
  if (!position) return null;
  return (
    <DepositAmounts
      title={i18n.addMoreLiquidity}
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
  );
};

export default IncreaseAmounts;

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePosition } from '@service/pool-manage';
import DepositAmounts from '@modules/DepositAmounts';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';

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
  const { tokenId } = useParams();
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  if (!position) return <div>loading...</div>;

  const { priceLower, priceUpper } = position;

  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();

  const isRangeValid = useMemo(() => {
    try {
      return priceLower && priceUpper ? (priceUpper.greaterThan(new Unit(0)) ? priceLower.lessThan(priceUpper) : true) : null;
    } catch {
      return null;
    }
  }, [priceLower, priceUpper]);

  return <DepositAmounts title={i18n.addMoreLiquidity} register={register} setValue={setValue} getValues={getValues} isRangeValid={isRangeValid} position={position} />;
};

export default IncreaseAmounts;

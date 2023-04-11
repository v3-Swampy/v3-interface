import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useI18n from '@hooks/useI18n';
import { PositionForUI } from '@service/pool-manage';
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

const IncreaseAmounts: React.FC<{ detail: PositionForUI }> = ({ detail }) => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();

  const { priceLower, priceUpper } = detail;
  const isRangeValid = useMemo(() => {
    try {
      return priceLower && priceUpper ? (priceUpper.greaterThan(Unit.fromMinUnit(0)) ? priceLower.lessThan(priceUpper) : true) : null;
    } catch {
      return null;
    }
  }, [priceLower, priceUpper]);

  return (
    <div>
      <div>{i18n.addMoreLiquidity}</div>
      <DepositAmounts register={register} setValue={setValue} getValues={getValues} isRangeValid={isRangeValid} detail={detail} />
    </div>
  );
};

export default IncreaseAmounts;

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePosition } from '@service/position';
import DepositAmounts from '@modules/Position/DepositAmounts';
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

  const { leftToken, rightToken, fee, priceLower, priceUpper } = position ?? {};

  const { register, handleSubmit: withForm, setValue, getValues, watch } = useForm();

  if (!position) return null;
  return (
    <DepositAmounts
      title={i18n.addMoreLiquidity}
      register={register}
      setValue={setValue}
      getValues={getValues}
      tokenA={leftToken}
      tokenB={rightToken}
      priceLower={priceLower}
      priceUpper={priceUpper}
      fee={fee}
    />
  );
};

export default IncreaseAmounts;

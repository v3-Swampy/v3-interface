import React from 'react';
import useI18n from '@hooks/useI18n';
import TokenPair from '@modules/Position/TokenPair';
import Status from '@modules/Position/PositionStatus';
import { type PositionForUI } from '@service/position';
import TokenPairAmount from '@modules/Position/TokenPairAmount';

const transitions = {
  en: {
    feeTier: 'Fee Tier',
    addMoreLiquidity: 'Add more liquidity',
  },
  zh: {
    feeTier: 'Fee Tier',
    addMoreLiquidity: 'Add more liquidity',
  },
} as const;

const PairInfo: React.FC<{ position: PositionForUI | undefined }> = ({ position }) => {
  const i18n = useI18n(transitions);
  const { fee, amount0, amount1 } = position ?? {};

  if (!position) return null;
  return (
    <div>
      <div className="flex md:px-16px mobile:gap-22px lt-mobile:justify-between">
        <TokenPair position={position} showFee={false} />
        <Status position={position} />
      </div>
      <div className="flex flex-col w-full mt-12px rounded-20px bg-orange-light-hover p-16px">
        <TokenPairAmount amount0={amount0} amount1={amount1} position={position} />
        <div className="mt-18px pl-32px font-normal text-sm flex justify-between text-black-normal">
          <span>{i18n.feeTier}</span>
          <span>{(fee ?? 0) / 10000}%</span>
        </div>
      </div>
    </div>
  );
};

export default PairInfo;

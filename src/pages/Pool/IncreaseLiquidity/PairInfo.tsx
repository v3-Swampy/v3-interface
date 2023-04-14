import React from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import TokenPair from '@modules/TokenPair';
import Status from '@modules/Status';
import { type PositionForUI, usePosition } from '@service/pool-manage';
import TokenPairAmount from '@modules/TokenPairAmount';

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

const PairInfo: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  if (!position) return <div>loading...</div>;
  const { fee, amount0, amount1 } = position;

  return (
    <div>
      <div className="flex p-x-16px justify-between">
        <TokenPair position={position} showFee={false} />
        <Status position={position} />
      </div>
      <div className="flex flex-col w-full mt-12px rounded-20px bg-orange-light-hover p-16px">
        <TokenPairAmount amount0={amount0} amount1={amount1} />
        <div className="mt-18px pl-32px font-medium text-sm flex justify-between text-black-normal">
          <span>{i18n.feeTier}</span>
          <span>{fee / 10000}%</span>
        </div>
      </div>
    </div>
  );
};

export default PairInfo;

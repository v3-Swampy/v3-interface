import React from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import TokenPair from '@modules/TokenPair';
import Status from '@modules/Status';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { type Token } from '@service/tokens';
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
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const { fee } = detail;

  return (
    <div>
      <div className="flex p-x-16px justify-between">
        <TokenPair position={detail} showFee={false} />
        <Status position={detail} />
      </div>
      <div className="flex flex-col w-full mt-12px rounded-20px bg-orange-light-hover p-16px">
        <TokenPairAmount showRatio={false} />
        <div className="mt-18px pl-32px font-medium text-sm flex justify-between text-black-normal">
          <span>{i18n.feeTier}</span>
          <span>{fee / 10000}%</span>
        </div>
      </div>
    </div>
  );
};

export default PairInfo;

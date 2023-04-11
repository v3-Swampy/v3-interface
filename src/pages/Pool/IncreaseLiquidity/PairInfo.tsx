import React from 'react';
import useI18n from '@hooks/useI18n';
import TokenPair from '@modules/TokenPair';
import Status from '@modules/Status';
import { PositionForUI } from '@service/pool-manage';
import { type Token } from '@service/tokens';

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

const TokenItem: React.FC<{ token: Token | null }> = ({ token }) => {
  return (
    <div className="flex items-center justify-between text-14px leading-18px text-black-normal w-full">
      <div className="flex items-center">
        <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
      </div>
      <div>
        <span className="mr-8px">0.123</span>
      </div>
    </div>
  );
};

const PairInfo: React.FC<{ detail: PositionForUI }> = ({ detail }) => {
  const { leftToken, rightToken, fee } = detail;
  const i18n = useI18n(transitions);

  return (
    <div>
      <div className="flex gap-22px">
        <TokenPair position={detail} showFee={false} />
        <Status position={detail} />
      </div>
      <div className="flex flex-col gap-8px w-full">
        <TokenItem token={leftToken} />
        <TokenItem token={rightToken} />
        <div>
          <span>{i18n.feeTier}</span>
          <span>{fee / 10000}%</span>
        </div>
      </div>
    </div>
  );
};

export default PairInfo;

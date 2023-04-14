import React from 'react';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n from '@hooks/useI18n';
import Button from '@components/Button';
import { type PositionForUI, usePosition, usePositionFees, useIsPositionOwner } from '@service/position';
import { type Token } from '@service/tokens';
import TokenPairAmount from '@modules/Position/TokenPairAmount';

const transitions = {
  en: {
    collect_fees: 'Collect Fees',
    unclaimed_fees: 'Unclaimed Fees',
  },
  zh: {
    collect_fees: '获取收益',
    unclaimed_fees: '待获取收益',
  },
} as const;

const UnclaimedFees: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  const { liquidity } = position ?? {};
  const [fee0, fee1] = usePositionFees(Number(tokenId));
  const isOwner = useIsPositionOwner(Number(tokenId));

  if (!position) null;
  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">{i18n.unclaimed_fees}</span>
          <span className="text-32px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">${liquidity}</span>
        </div>
        {isOwner && (
          <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="gradient">
            {i18n.collect_fees}
          </Button>
        )}
      </div>
      <TokenPairAmount amount0={new Unit(fee0 ?? 0)} amount1={new Unit(fee1 ?? 0)} position={position} tokenId={tokenId} />
    </div>
  );
};

export default UnclaimedFees;

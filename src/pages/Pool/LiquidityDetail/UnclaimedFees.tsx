import React from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import Button from '@components/Button';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { type Token } from '@service/tokens';

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

const TokenItem: React.FC<{ token: Token | null }> = ({ token }) => {
  return (
    <div className="flex items-center justify-between text-14px leading-18px text-black-normal w-full">
      <div className="flex items-center">
        <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
        <span className="ml-8px">{token?.symbol}</span>
      </div>
      <div>
        <span className="mr-8px">0.123</span>
        <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">50%</span>
      </div>
    </div>
  );
};

const UnclaimedFees: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const { liquidity, leftToken, rightToken } = detail;

  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">{i18n.unclaimed_fees}</span>
          <span className="text-32px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">${liquidity}</span>
        </div>
        <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="gradient">
          {i18n.collect_fees}
        </Button>
      </div>
      <div className="flex flex-col gap-8px w-full">
        <TokenItem token={leftToken} />
        <TokenItem token={rightToken} />
      </div>
    </div>
  );
};

export default UnclaimedFees;

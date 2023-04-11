import React from 'react';
import { useParams } from 'react-router-dom';
import Button from '@components/Button';
import Status from '@modules/Status';
import TokenPair from '@modules/TokenPair';
import useI18n from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { getInverted } from './SelectedRange';

const transitions = {
  en: {
    increase_liquidity: 'Increase Liquidity',
    remove_liquidity: 'Remove Liquidity',
  },
  zh: {
    increase_liquidity: '增加流动性',
    remove_liquidity: '清除流动性',
  },
} as const;

const DetailHeader: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const inverted = getInverted();

  return (
    <div className="flex width-full justify-between">
      <div className="flex gap-22px">
        <TokenPair position={detail} inverted={inverted} />
        <Status position={detail} />
      </div>
      <div className="flex justify-end gap-16px">
        <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="orange-light">
          {i18n.increase_liquidity}
        </Button>
        <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="gradient">
          {i18n.remove_liquidity}
        </Button>
      </div>
    </div>
  );
};

export default DetailHeader;

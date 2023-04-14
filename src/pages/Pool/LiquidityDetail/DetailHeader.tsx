import React from 'react';
import { useRecoilState } from 'recoil';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@components/Button';
import Status from '@modules/Position/PositionStatus';
import TokenPair from '@modules/Position/TokenPair';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePosition, useIsPositionOwner } from '@service/position';
import { useInvertedState } from '@modules/Position/invertedState';

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
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  const navigate = useNavigate();
  const [inverted] = useInvertedState(tokenId);
  const isOwner = useIsPositionOwner(Number(tokenId));

  if (!position) return null;
  return (
    <div className="flex width-full justify-between">
      <div className="flex gap-22px">
        <TokenPair position={position} inverted={inverted} />
        <Status position={position} />
      </div>
      {isOwner && (
        <div className="flex justify-end gap-16px">
          <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="orange-light" onClick={() => navigate(`/pool/increase_liquidity/${tokenId}`)}>
            {i18n.increase_liquidity}
          </Button>
          <Button className="px-24px h-40px rounded-100px text-14px font-medium" color="gradient" onClick={() => navigate(`/pool/remove_liquidity/${tokenId}`)}>
            {i18n.remove_liquidity}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetailHeader;

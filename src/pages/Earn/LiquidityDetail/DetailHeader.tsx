import React from 'react';
import { useRecoilState } from 'recoil';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@components/Button';
import Status from '@modules/Position/PositionStatus';
import TokenPair from '@modules/Position/TokenPair';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, PositionStatus, usePosition, useIsPositionOwner, usePositionStatus } from '@service/position';
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
  const position = usePosition(Number(tokenId));
  const navigate = useNavigate();
  const [inverted] = useInvertedState(tokenId);
  const isOwner = useIsPositionOwner(Number(tokenId));
  const status = usePositionStatus(position as PositionForUI);

  if (!position) return null;

  return (
    <div className="flex lt-md:flex-wrap justify-between">
      <div className="ml-16p flex mobile:gap-22px lt-mobile:w-full lt-mobile:justify-between">
        <TokenPair position={position} inverted={inverted} />
        <Status position={position} />
      </div>
      {isOwner && status && status !== PositionStatus.Closed && (
        <div className="flex md:justify-end gap-16px lt-mobile:gap-12px lt-mini:gap-8px lt-md:w-full lt-md:mt-24px">
          <Button
            className="px-24px h-40px rounded-100px text-14px font-normal !text-orange-normal lt-md:max-w-50%"
            color="orange-light"
            onClick={() => navigate(`/pool/increase_liquidity/${tokenId}`)}
            id="pool-goto-increase-liquidity"
          >
            {i18n.increase_liquidity}
          </Button>
          <Button
            className="px-24px h-40px rounded-100px text-14px font-normal lt-md:max-w-50%"
            color="gradient"
            onClick={() => navigate(`/pool/remove_liquidity/${tokenId}`)}
            id="pool-goto-remove-liquidity"
          >
            {i18n.remove_liquidity}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetailHeader;

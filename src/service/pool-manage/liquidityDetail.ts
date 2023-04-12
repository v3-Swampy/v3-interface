import { selectorFamily, useRecoilValue } from 'recoil';
import { PositionsForUISelector, type PositionForUI } from './positions';

const liquidityDetailSelector = selectorFamily({
  key: `PositionDetailForUI-${import.meta.env.MODE}`,
  get:
    (tokenId) =>
    ({ get }) => {
      const positions = get(PositionsForUISelector);
      if (!positions) return undefined;
      return positions.find((position) => position.id === tokenId);
    },
});

export const useLiquidityDetail = (tokenId: number) => useRecoilValue(liquidityDetailSelector(tokenId));

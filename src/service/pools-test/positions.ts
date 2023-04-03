import { atom, useRecoilValue } from "recoil";
import { type Token, TokenVST, TokenCFX } from "@service/tokens";
import { FeeAmount } from "@service/pairs&pool";

export enum PositionStatus {
  InRange,
  OutOfRange,
  Closed
}

interface Position {
  id: string;
  tokenA: Token;
  tokenB: Token;
  min: string;
  max: string;
  fee: FeeAmount;
  status: PositionStatus;
}

const positionsState = atom<Array<Position>>({
  key: `positionsState-${import.meta.env.MODE}`,
  default: [{
    id: 'test',
    tokenA: TokenCFX,
    tokenB: TokenVST,
    min: '1',
    max: '2.01',
    fee: FeeAmount.MEDIUM,
    status: PositionStatus.InRange,
  }],
});

export const usePositions = () => useRecoilValue(positionsState);
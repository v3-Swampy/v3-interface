import React from 'react';
import { useRecoilState } from 'recoil';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { PositionForUI, usePosition } from '@service/pool-manage';
import { trimDecimalZeros } from '@utils/numberUtils';
import { type Token, getUnwrapperTokenByAddress } from '@service/tokens';
import { invertedState } from '@modules/SelectedPriceRange';

const TokenItem: React.FC<{ token: Token | null; amount: string; ratio: number | undefined }> = ({ token, amount, ratio }) => {
  return (
    <div className="flex items-center justify-between text-14px leading-18px font-medium text-black-normal w-full">
      <div className="flex items-center">
        <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
        <span className="ml-8px">{token?.symbol}</span>
      </div>
      <div>
        <span>{amount}</span>
        {typeof ratio === 'number' && (
          <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium ml-8px">{ratio}%</span>
        )}
      </div>
    </div>
  );
};

const TokenPairAmount: React.FC<{amount0: Unit, amount1: Unit, ratio?: number }> = ({amount0, amount1, ratio }) => {
  const { tokenId } = useParams();
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  if (!position) return <div>loading...</div>;
  const { token1, liquidity, leftToken, rightToken} = position;
  // ui token pair revert button
  const [inverted] = useRecoilState(invertedState);
  // ui init display is inverted with token1/token0
  const displayReverted = getUnwrapperTokenByAddress(token1.address)?.address === rightToken?.address;
  const amountInverted = inverted !== displayReverted;
  const tokenA = !inverted ? leftToken : rightToken;
  const tokenB = !inverted ? rightToken : leftToken;
  const amountA = !amountInverted ? amount1 : amount0;
  const amountB = !amountInverted ? amount0 : amount1;
  const amountAStr = trimDecimalZeros(amountA?.toDecimalStandardUnit(5, tokenA?.decimals));
  const amountBStr = trimDecimalZeros(amountB?.toDecimalStandardUnit(5, tokenB?.decimals));
  const removed = liquidity === '0';

  return (
    <div className="flex flex-col gap-8px w-full">
      <TokenItem token={tokenA} amount={amountAStr} ratio={typeof ratio == 'number' && !removed ? (!amountInverted ? ratio : 100 - ratio) : undefined} />
      <TokenItem token={tokenB} amount={amountBStr} ratio={typeof ratio == 'number' && !removed ? (!amountInverted ? 100 - ratio : ratio) : undefined} />
    </div>
  );
};

export default TokenPairAmount;

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BorderBox from '@components/Box/BorderBox';
import TokenPair from '@modules/Position/TokenPair';
import { usePoolData, PoolData } from '../LeaderBoard/fetchData';
import { setTokens as setLiquidityTokens } from '@pages/Pool/AddLiquidity/SelectPair';
import { setToken as setSwapToken } from '@service/swap';
import { ReactComponent as LinkIcon } from '@assets/icons/link3.svg';
import { getTokenByAddress, TokenCFX } from '@service/tokens';

export const PoolItem: React.FC<{
  data: PoolData;
}> = ({ data }) => {
  const navigate = useNavigate();
  const { token0Address, token1Address, wPoints, fPoints, tvl } = data;
  const leftToken = useMemo(() => getTokenByAddress(token0Address), [token0Address]);
  const rightToken = useMemo(() => getTokenByAddress(token1Address), [token1Address]);

  return (
    <BorderBox
      className="
        md:h-84px lt-md:py-16px px-32px lt-md:px-8px items-center rounded-16px
        grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lt-md:grid-cols-[2fr_1fr_1fr_1fr] lt-sm:grid-cols-3
        lt-md:gap-16px
      "
      variant="orange-light-hover"
    >
      <div className="flex flex-col items-start gap-8px lt-sm:col-span-3">
        <span className="text-12px text-gray-normal">Pool Name</span>
        <div className="flex items-center">
          <TokenPair
            position={
              {
                leftToken,
                rightToken,
              } as any
            }
            showFee={false}
          />
        </div>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">TVL</span>
        <span className="text-14px text-black-normal font-medium">{'$ ' + tvl}</span>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">W Points</span>
        <span className="text-14px text-black-normal font-medium">{wPoints + 'x'}</span>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">F Points</span>
        <span className="text-14px text-black-normal font-medium">{fPoints + 'x'}</span>
      </div>
      <div className="flex flex-col items-start gap-8px lt-md:col-span-4 lt-md:w-full lt-sm:col-span-3 lt-sm:w-full">
        <span className="text-12px text-gray-normal opacity-0 lt-md:hidden">Actions</span>
        <div className="flex items-center gap-8px lt-md:w-full lt-sm:w-full">
          <div
            className="
              h-32px px-32px inline-flex justify-center items-center gap-2px rounded-100px
              border-2px border-solid border-orange text-orange-normal text-14px font-medium cursor-pointer whitespace-nowrap
            "
            onClick={() => {
              if (leftToken?.symbol === 'WCFX') {
                setSwapToken({ type: 'sourceToken', token: TokenCFX });
              } else {
                setSwapToken({ type: 'sourceToken', token: leftToken });
              }
              if (rightToken?.symbol === 'WCFX') {
                setSwapToken({ type: 'destinationToken', token: TokenCFX });
              } else {
                setSwapToken({ type: 'destinationToken', token: rightToken });
              }
              setTimeout(() => {
                navigate('/swap');
              }, 50);
            }}
          >
            Trade
            <LinkIcon className="ml-2px w-16px h-16px" />
          </div>
          <div
            className="
              h-32px px-32px inline-flex justify-center items-center gap-2px rounded-100px
              border-2px border-solid border-orange text-orange-normal text-14px font-medium cursor-pointer whitespace-nowrap
            "
            onClick={() => {
              setLiquidityTokens(leftToken!, rightToken!);

              setTimeout(() => {
                navigate(`/pool/add_liquidity`);
              }, 50);
            }}
          >
            Add Liquidity
            <LinkIcon className="ml-2px w-16px h-16px" />
          </div>
        </div>
      </div>
    </BorderBox>
  );
};

const EarnPoints: React.FC = () => {
  const pools = usePoolData(20);
  if (!pools) return null;
  console.log('pools', pools);

  return (
    <div className="flex flex-col gap-24px lt-md:gap-16px">
      {pools.map((pool) => (
        <PoolItem key={pool.address} data={pool} />
      ))}
    </div>
  );
};

export default EarnPoints;

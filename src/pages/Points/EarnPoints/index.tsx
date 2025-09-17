import React from 'react';
import { useNavigate } from 'react-router-dom';
import BorderBox from '@components/Box/BorderBox';
import TokenPair from '@modules/Position/TokenPair';
import { usePools } from '@service/farming';
import { setTokens as setLiquidityTokens } from '@pages/Pool/AddLiquidity/SelectPair';
import { setCurrentFee } from '@pages/Pool/AddLiquidity/SelectFeeTier';
import { setToken as setSwapToken } from '@service/swap';
import { ReactComponent as LinkIcon } from '@assets/icons/link3.svg';

export const PoolItem: React.FC<{
  data: NonNullable<ReturnType<typeof usePools>>[number];
}> = ({ data }) => {
  const navigate = useNavigate();

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
                leftToken: data.pairInfo.leftToken,
                rightToken: data.pairInfo.rightToken,
                fee: data.pairInfo.fee,
              } as any
            }
          />
        </div>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">TVL</span>
        <span className="text-14px text-black-normal font-medium">123</span>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">W Points</span>
        <span className="text-14px text-black-normal font-medium">123</span>
      </div>
      <div className="flex flex-col items-start gap-8px border-0 lt-md:border-l-2px lt-md:border-solid lt-md:border-orange-light lt-md:pl-8px">
        <span className="text-12px text-gray-normal">F Points</span>
        <span className="text-14px text-black-normal font-medium">123</span>
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
              setSwapToken({ type: 'sourceToken', token: data.pairInfo.leftToken });
              setSwapToken({ type: 'destinationToken', token: data.pairInfo.rightToken });
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
              setLiquidityTokens(data.pairInfo.leftToken!, data.pairInfo.rightToken!);
              setCurrentFee(Number(data.pairInfo.fee));

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
  const pools = usePools();
  if (!pools) return null;

  return (
    <div className="flex flex-col gap-24px lt-md:gap-16px">
      {pools.map((pool) => (
        <PoolItem key={pool.poolAddress} data={pool} />
      ))}
    </div>
  );
};

export default EarnPoints;

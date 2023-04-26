import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import { handleClaimUnStake, handleClaimAndReStake, MyFarmsPositionType, calcPostionLiquidity } from '@service/farming/myFarms';
import { usePositionStatus, PositionStatus } from '@service/position';
import { getCurrentIncentiveKey, getCurrentIncentivePeriod } from '@service/farming';
import { useAccount } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import showClaimAndUnstakeModal from './ClaimAndUnstakeModal';
import { TokenVST } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { addRecordToHistory } from '@service/history';

const transitions = {
  en: {
    myPosition: 'My Positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Liquidity',
  },
  zh: {
    myPosition: 'My Positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Liquidity',
  },
} as const;

const className = {
  title: 'color-gray-normal text-xs font-500 not-italic leading-15px mb-2',
  content: 'color-black-normal text-12px font-500 not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer',
  buttonFarming: 'bg-green-normal/10 color-green-normal',
  buttonPaused: 'bg-orange-dot/10 color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center',
};

const PostionItem: React.FC<{ position: MyFarmsPositionType; pid: number; token0Pirce: string; token1Pirce: string }> = ({ position, pid, token0Pirce, token1Pirce }) => {
  const { claimable, isActive } = position;
  const i18n = useI18n(transitions);
  const account = useAccount();
  const currentIncentiveKey = getCurrentIncentiveKey(position.address);
  const status = usePositionStatus(position.position);
  const isPaused = useMemo(() => {
    return isActive ? status == PositionStatus.OutOfRange : true;
  }, [status]);

  const liquidity = useMemo(() => {
    return calcPostionLiquidity(position, token0Pirce, token1Pirce);
  }, [position, token0Pirce, token1Pirce]);

  return (
    <div key={position.tokenId} className="mt-4 grid grid-cols-18">
      <div className={`${className.buttonBase} ${isPaused ? className.buttonPaused : className.buttonFarming} ml-15px w-122px col-span-6`}>
        <span className={`inline-block ${isPaused ? 'bg-orange-dot' : 'bg-green-normal'} w-6px h-6px rounded-full absolute -left-14px`}></span>
        {isPaused ? <CoffeeCupIcon className="w-6 h-6 mr-1"></CoffeeCupIcon> : <HammerIcon className="w-6 h-6 mr-1"></HammerIcon>}
        {isPaused ? i18n.paused : i18n.farming}
      </div>
      <div className="col-span-4">
        <div className={`${className.title}`}>{i18n.liquidity}</div>
        {/* @ts-ignore */}
        <div className={`${className.content} flex items-center`}>${liquidity ? numFormat(liquidity.toFixed(2)) : 0}</div>
      </div>
      <div className="col-span-3">
        <div className={`${className.title}`}>{i18n.claimable}</div>
        <div className={`${className.content} flex items-center`}>{claimable ? numFormat(new Unit(claimable).toDecimalStandardUnit(2, TokenVST.decimals)) : 0} VST</div>
      </div>
      <div className="flex items-center justify-end col-span-5">
        {!isActive ? (
          <AuthConnectButton className={`${className.buttonBase} ${className.buttonPausedSolid}`}>
            <div
              className={`${className.buttonBase} ${className.buttonPausedSolid}`}
              onClick={() =>
                showClaimAndUnstakeModal({
                  isActive,
                  incentive: position?.whichIncentiveTokenIn,
                  id: position.tokenId,
                  pid,
                  currentIncentiveKey,
                  position: position.position,
                })
              }
            >
              {i18n.claim} & {i18n.unstake}
            </div>
          </AuthConnectButton>
        ) : (
          <>
            <div
              className={`${className.buttonBase} mr-2 color-green-normal border border-solid border-green-normal`}
              onClick={async () => {
                const txHash = await handleClaimAndReStake({
                  isActive,
                  keyThatTokenIdIn: position?.whichIncentiveTokenIn,
                  currentIncentiveKey: currentIncentiveKey,
                  tokenId: position.tokenId,
                  pid,
                  accountAddress: account as string,
                });
                addRecordToHistory({
                  txHash,
                  type: 'MyFarms_Claim',
                });
              }}
            >
              {i18n.claim}
            </div>
            <div
              className={`${className.buttonBase} ${className.buttonPausedSolid}`}
              onClick={async () => {
                const txHash = await handleClaimUnStake({
                  isActive,
                  key: currentIncentiveKey,
                  tokenId: position.tokenId,
                  pid,
                  accountAddress: account as string,
                });
                addRecordToHistory({
                  txHash,
                  type: 'MyFarms_Unstake',
                });
              }}
            >
              {i18n.unstake}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Positions: React.FC<{ positionList: Array<MyFarmsPositionType>; pid: number; isEnded: boolean; token0Pirce: string; token1Pirce: string }> = ({
  positionList,
  pid,
  isEnded,
  token0Pirce,
  token1Pirce,
}) => {
  const i18n = useI18n(transitions);
  const currentIncentive = getCurrentIncentivePeriod();

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6">
      <div className="flex items-center">
        <span className="text-14px font-500 font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({positionList.length})
        </span>
        <span className={`${className.incentiveHit} ${isEnded ? 'color-white-normal bg-gray-normal' : 'color-orange-normal bg-orange-normal/10'}`}>
          <span className="i-mdi:clock mr-1 text-14px"></span>
          <span className="text-12px font-400 font-not-italic leading-15px ml-0.5">Incentive until: {new Date(currentIncentive.endTime * 1000).toLocaleString()}</span>
        </span>
      </div>
      <div>
        {positionList.map((p: any, i) => (
          <PostionItem position={p} key={p.tokenId} pid={pid} token0Pirce={token0Pirce} token1Pirce={token1Pirce} />
        ))}
      </div>
    </div>
  );
};

export default Positions;

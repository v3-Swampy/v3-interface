import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import { handleClaimUnStake as _handleClaimUnStake, handleClaimAndReStake as _handleClaimAndReStake, MyFarmsPositionType, calcPostionLiquidity } from '@service/farming/myFarms';
import { usePositionStatus, PositionStatus } from '@service/position';
import { getCurrentIncentiveKey, getCurrentIncentivePeriod } from '@service/farming';
import { useAccount, useIsChainMatch } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import showClaimAndUnstakeModal from './ClaimAndUnstakeModal';
import showUnstakeModal from './UnstakeModal';
import { TokenVST } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { addRecordToHistory } from '@service/history';
import useInTransaction from '@hooks/useInTransaction';
import Button from '@components/Button';
import { ReactComponent as ClockIcon } from '@assets/icons/clock.svg';
import { useCanClaim } from '@service/farming';
import Tooltip from '@components/Tooltip';

const transitions = {
  en: {
    myPosition: 'My staked positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Est. earned',
    liquidity: 'Liquidity',
    tooltipPaused: 'Your farming yield is low due to price out of range.',
    tooltipFarming: 'Your position is farming hard.',
  },
  zh: {
    myPosition: 'My staked positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Est. earned',
    liquidity: 'Liquidity',
    tooltipPaused: 'Your farming yield is low due to price out of range.',
    tooltipFarming: 'Your position is farming hard.',
  },
} as const;

const className = {
  title: 'color-gray-normal text-xs font-500 not-italic leading-15px mb-2',
  content: 'color-black-normal text-12px font-500 not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer',
  buttonFarming: 'bg-green-normal/10 color-green-normal',
  buttonFarmingSolid: 'color-green-normal border border-solid border-green-normal bg-white-normal',
  buttonPaused: 'bg-orange-dot/10 color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot bg-white-normal',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center',
};

const PostionItem: React.FC<{ position: MyFarmsPositionType; pid: number; token0Pirce: string; token1Pirce: string }> = ({ position, pid, token0Pirce, token1Pirce }) => {
  const { claimable, isActive } = position;
  const i18n = useI18n(transitions);
  const account = useAccount();
  const currentIncentiveKey = getCurrentIncentiveKey(position.address);
  const status = usePositionStatus(position.position);
  const { inTransaction: unstakeInTransaction, execTransaction: handleClaimUnStake } = useInTransaction(_handleClaimUnStake, true);
  const { inTransaction: claimIntransaction, execTransaction: handleClaimAndReStake } = useInTransaction(_handleClaimAndReStake, true);
  const isCanClaim = useCanClaim();
  const isChainMath = useIsChainMatch();

  const isPaused = useMemo(() => {
    return isActive ? status == PositionStatus.OutOfRange : true;
  }, [status]);

  const liquidity = useMemo(() => {
    return calcPostionLiquidity(position, token0Pirce, token1Pirce);
  }, [position, token0Pirce, token1Pirce]);

  return (
    <div key={position.tokenId} className="mt-4 grid grid-cols-18">
      {isPaused ? (
        <Tooltip text={i18n.tooltipPaused}>
          <div className={`${className.buttonBase} ${className.buttonPaused} ml-15px w-122px col-span-6`}>
            <span className={`inline-block bg-orange-dot w-6px h-6px rounded-full absolute -left-14px`}></span>
            {<CoffeeCupIcon className="w-6 h-6 mr-1"></CoffeeCupIcon>}
            {i18n.paused}
          </div>
        </Tooltip>
      ) : (
        <Tooltip text={i18n.tooltipFarming}>
          <div className={`${className.buttonBase} ${className.buttonFarming} ml-15px w-122px col-span-6`}>
            <span className={`inline-block bg-green-normal w-6px h-6px rounded-full absolute -left-14px`}></span>
            {<HammerIcon className="w-6 h-6 mr-1"></HammerIcon>}
            {i18n.farming}
          </div>
        </Tooltip>
      )}
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
          <AuthConnectButton className={`${className.buttonBase} ${className.buttonPausedSolid} !border-none !px-10px`}>
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
            {isChainMath && (
              <AuthConnectButton className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} mr-2 !border-none !px-10px`}>
                <Button
                  disabled={!isCanClaim}
                  loading={claimIntransaction}
                  color="white"
                  className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} mr-2`}
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
                </Button>
              </AuthConnectButton>
            )}

            <AuthConnectButton className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} !border-none !px-10px`}>
              <Button
                loading={unstakeInTransaction}
                color="white"
                className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid}`}
                onClick={async () => {
                  if (!isCanClaim) {
                    showUnstakeModal({
                      isActive: true,
                      incentive: position?.whichIncentiveTokenIn,
                      id: position.tokenId,
                      pid,
                      currentIncentiveKey,
                      position: position.position,
                    });
                  } else {
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
                  }
                }}
              >
                {i18n.unstake}
              </Button>
            </AuthConnectButton>
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

  const endTime = useMemo(() => (isEnded ? currentIncentive.startTime : currentIncentive.endTime), [isEnded]);

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6">
      <div className="flex items-center">
        <span className="text-14px font-500 font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({positionList.length})
        </span>
        <span className={`${className.incentiveHit} ${isEnded ? 'color-white-normal bg-gray-slight' : 'color-orange-normal bg-orange-normal/10'}`}>
          <ClockIcon className="mr-1 w-12px h-12px" />
          <span className="text-12px font-400 font-not-italic leading-15px ml-0.5">Incentive until: {new Date(endTime * 1000).toLocaleString()}</span>
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

import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import { handleClaimUnStake as _handleClaimUnStake, handleClaimAndReStake as _handleClaimAndReStake, MyFarmsPositionType, calcPositionLiquidity } from '@service/farming/myFarms';
import { usePositionStatus, PositionStatus } from '@service/position';
import { getCurrentIncentiveKey, useCurrentIncentive } from '@service/farming';
import { useAccount, useIsChainMatch } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
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
    tooltipPaused: 'Inactive Liquidity, the current price is outside the range of this position.',
    tooltipFarming: 'Active Liquidity, the current price is within the range of this position.',
  },
  zh: {
    myPosition: 'My staked positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Est. earned',
    liquidity: 'Liquidity',
    tooltipPaused: 'Inactive Liquidity, the current price is outside the range of this position.',
    tooltipFarming: 'Active Liquidity, the current price is within the range of this position.',
  },
} as const;

const className = {
  title: 'color-gray-normal text-xs font-normal not-italic leading-15px mb-2 lt-mobile:mb-1',
  content: 'color-black-normal text-12px font-normal not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer lt-mobile:ml-0 lt-mobile:mt-2 lt-mobile:mb-2',
  buttonFarming: 'bg-green-normal/10 color-green-normal',
  buttonFarmingSolid: 'color-green-normal border border-solid border-green-normal bg-white-normal',
  buttonPaused: 'bg-orange-dot/10 color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot bg-white-normal',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center lt-mobile:mt-2 lt-mobile:ml-0',
  buttonFamingAndPauseMobile: 'lt-mobile:w-[fit-content] lt-mobile:h-24px lt-mobile:px-2 lt-mobile:text-12px lt-mobile:leading-15px lt-mobile:py-0 lt-mobile:!mt-0',
};

const PositionItem: React.FC<{ position: MyFarmsPositionType; pid: number; token0Price: string; token1Price: string }> = ({ position, pid, token0Price, token1Price }) => {
  const { claimable, isActive } = position;
  const i18n = useI18n(transitions);
  const account = useAccount();
  const currentIncentiveKey = getCurrentIncentiveKey(position.address);
  const status = usePositionStatus(position.position);
  const { inTransaction: unstakeInTransaction, execTransaction: handleClaimUnStake } = useInTransaction(_handleClaimUnStake, true);
  const { inTransaction: claimIntransaction, execTransaction: handleClaimAndReStake } = useInTransaction(_handleClaimAndReStake, true);
  const isCanClaim = useCanClaim();
  const isChainMath = useIsChainMatch();
  const inFetchingTokenPrice = token0Price === '' || token1Price === '';

  const isPaused = useMemo(() => {
    return isActive ? status == PositionStatus.OutOfRange : true;
  }, [status]);

  const liquidity = useMemo(() => {
    return calcPositionLiquidity(position, token0Price, token1Price);
  }, [position, token0Price, token1Price]);

  return (
    <div
      key={position.tokenId}
      className={`mt-4 grid grid-cols-18 lt-mobile:border-b-1 lt-mobile:border-b-solid lt-mobile:pb-2 lt-mobile:last:border-none lt-mobile:last:pb-0 lt-mobile:last:-mb-2 ${
        isActive ? 'lt-mobile:border-b-orange-lightHover' : 'lt-mobile:border-b-gray-light/30'
      }`}
    >
      <div className="col-span-6 lt-mobile:col-span-18 lt-mobile:pl-16px">
        {isPaused ? (
          <Tooltip text={i18n.tooltipPaused}>
            <div className={`${className.buttonBase} ${className.buttonPaused} ml-15px w-122px ${className.buttonFamingAndPauseMobile}`}>
              <span className={`inline-block bg-orange-dot w-6px h-6px rounded-full absolute -left-14px`}></span>
              {<CoffeeCupIcon className="w-6 h-6 mr-1 lt-mobile:w-18px lt-mobile:h-18px"></CoffeeCupIcon>}
              {i18n.paused}
            </div>
          </Tooltip>
        ) : (
          <Tooltip text={i18n.tooltipFarming}>
            <div className={`${className.buttonBase} ${className.buttonFarming} ml-15px w-122px ${className.buttonFamingAndPauseMobile}`}>
              <span className={`inline-block bg-green-normal w-6px h-6px rounded-full absolute -left-14px`}></span>
              {<HammerIcon className="w-6 h-6 mr-1 lt-mobile:w-18px lt-mobile:h-18px"></HammerIcon>}
              {i18n.farming}
            </div>
          </Tooltip>
        )}
      </div>
      <div className="col-span-4 lt-mobile:col-span-9 lt-mobile:px-2">
        <div className={`${className.title}`}>{i18n.liquidity}</div>
        {/* @ts-ignore */}
        <div className={`${className.content} flex items-center leading-16px`}>
          {inFetchingTokenPrice ? <Spin className='ml-8px text-16px' /> : `$${liquidity ? numFormat(liquidity.toFixed(2)) : 0}`}
        </div>
      </div>
      <div className="col-span-3 lt-mobile:col-span-9">
        <div className={`${className.title}`}>{i18n.claimable}</div>
        <div className={`${className.content} flex items-center`}>{claimable ? numFormat(new Unit(claimable).toDecimalStandardUnit(2, TokenVST.decimals)) : 0} VST</div>
      </div>
      <div className="flex items-center justify-end col-span-5 lt-mobile:col-span-18 lt-mobile:mt-2 lt-mobile:justify-around">
        {!isActive ? (
          <AuthConnectButton className={`${className.buttonBase} ${className.buttonPausedSolid} !border-none !px-10px lt-mobile:!w-full lt-mobile:justify-center`}>
            <div
              className={`${className.buttonBase} ${className.buttonPausedSolid} lt-mobile:!w-full lt-mobile:justify-center`}
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
              <span>
                {i18n.claim} & {i18n.unstake}
              </span>
            </div>
          </AuthConnectButton>
        ) : (
          <>
            {isChainMath && (
              <AuthConnectButton
                className={`${className.buttonBase} ${
                  isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid
                } mr-2 !border-none !px-10px lt-mobile:w-46% lt-mobile:mr-0`}
              >
                <Button
                  disabled={!isCanClaim}
                  loading={claimIntransaction}
                  color="white"
                  className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} mr-2 lt-mobile:w-46% lt-mobile:mr-0`}
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

            <AuthConnectButton className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} !border-none !px-10px lt-mobile:w-46%`}>
              <Button
                loading={unstakeInTransaction}
                color="white"
                className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} lt-mobile:w-46%`}
                onClick={async () => {
                  if (isCanClaim) {
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

const Positions: React.FC<{ positionList: Array<MyFarmsPositionType>; pid: number; isEnded: boolean; token0Price: string; token1Price: string }> = ({
  positionList,
  pid,
  isEnded,
  token0Price,
  token1Price,
}) => {
  const i18n = useI18n(transitions);
  const currentIncentive = useCurrentIncentive();

  const endTime = useMemo(() => (isEnded ? currentIncentive.period.startTime : currentIncentive.period.endTime), [isEnded, currentIncentive?.index]);

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6 lt-mobile:pt-8 lt-mobile:px-2 lt-mobile:pb-2 lt-mobile:-mt-4">
      <div className="flex items-center lt-mobile:flex-col lt-mobile:items-start">
        <span className="text-14px font-normal font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({positionList.length})
        </span>
        <span className={`${className.incentiveHit} ${isEnded ? 'color-white-normal bg-gray-slight' : 'color-orange-normal bg-orange-normal/10'}`}>
          {isEnded ? null : <ClockIcon className="mr-1 w-12px h-12px" />}
          <span className="text-12px  font-not-italic leading-15px ml-0.5">Incentive until: {new Date(endTime * 1000).toLocaleString()}</span>
        </span>
      </div>
      <div>
        {positionList.map((p: any, i) => (
          <PositionItem position={p} key={p.tokenId} pid={pid} token0Price={token0Price} token1Price={token1Price} />
        ))}
      </div>
    </div>
  );
};

export default Positions;

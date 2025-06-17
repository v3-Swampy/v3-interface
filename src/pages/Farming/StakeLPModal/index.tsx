import React, { useMemo, Suspense, useCallback } from 'react';
import cx from 'clsx';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import useInTransaction from '@hooks/useInTransaction';
import logo from '@assets/icons/logo_icon.svg';
import { usePositionsForUI, type PositionForUI } from '@service/position';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import PriceRange from '@modules/Position/PriceRange';
import { type PoolType, handleStakeLP as _handleStakeLP } from '@service/farming';
import { AuthTokenButtonOf721 } from '@modules/AuthTokenButton';
import { UniswapV3Staker, NonfungiblePositionManager } from '@contracts/index';
import { useNavigate } from 'react-router-dom';
import { hidePopup } from '@components/showPopup';
import Button from '@components/Button';
import { addRecordToHistory } from '@service/history';
import { useTokenPrice } from '@service/pairs&pool';
import { trimDecimalZeros } from '@utils/numberUtils';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { setTokens } from '@pages/Pool/AddLiquidity/SelectPair';
import { setCurrentFee } from '@pages/Pool/AddLiquidity/SelectFeeTier';
import AuthConnectButton from '@modules/AuthConnectButton';

const transitions = {
  en: {
    title: 'Stake LP',
    subTitle: 'Your {leftToken}/{rightToken} positions (LP out of range will not receive farming rewards)',
    liquidity: 'Liquidity:',
    stakeLP: 'Stake LP',
    more: 'Get more {leftToken}/{rightToken} LP ',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for {leftToken}/{rightToken}',
  },
  zh: {
    title: '质押 LP',
    subTitle: 'Your {leftToken}/{rightToken} positions (LP out of range will not receive farming rewards)',
    liquidity: 'Liquidity:',
    stakeLP: 'Stake LP',
    more: 'Get more {leftToken}/{rightToken} LP',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for {leftToken}/{rightToken}',
  },
} as const;

export enum ModalMode {
  Unknown,
  CreateLock,
  IncreaseAmount,
  IncreaseUnlockTime,
}

type Props = ConfirmModalInnerProps & PoolType;

const Position = ({ data, address, startTime, endTime, pid }: { data: PositionForUI; startTime: number; endTime: number } & Pick<PoolType, 'address' | 'pid'>) => {
  const i18n = useI18n(transitions);
  const { inTransaction, execTransaction: handleStakeLP } = useInTransaction(_handleStakeLP, true);

  const { amount0, amount1, leftToken, rightToken, fee } = data ?? {};

  const leftTokenPrice = useTokenPrice(leftToken?.address);
  const rightTokenPrice = useTokenPrice(rightToken?.address);

  let liquidity = useMemo(() => {
    const leftTokenLiquidity = leftTokenPrice && amount0 ? amount0.mul(leftTokenPrice).toDecimalStandardUnit(undefined, leftToken?.decimals) : '';
    const rightTokenLiquidity = rightTokenPrice && amount1 ? amount1.mul(rightTokenPrice).toDecimalStandardUnit(undefined, rightToken?.decimals) : '';
    const liquidity = leftTokenLiquidity && rightTokenLiquidity ? `$${trimDecimalZeros(new Unit(leftTokenLiquidity).add(rightTokenLiquidity).toDecimalMinUnit(5))}` : '--';
    return liquidity;
  }, [leftTokenPrice, rightTokenPrice, data.amount0, data.amount1]);

  const classNameButton = useMemo(() => {
    return 'inline-flex shrink-0 items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-normal not-italic color-orange-normal cursor-pointer lt-mobile:mt-20px lt-mobile:w-full lt-mobile:!bg-transparent lt-mobile:!color-orange-normal lt-mobile:border-1';
  }, []);

  return (
    <div className="rounded-4 bg-orange-light-hover p-4 flex justify-between items-center mb-4 lt-mobile:flex-col" key={data.id}>
      <div className="lt-mobile:w-full">
        <div>
          <span className="font-not-italic text-14px leading-18px color-gray-normal mr-0.5">{i18n.liquidity}</span>
          <span className="font-normal font-not-italic text-14px leading-18px color-black-normal mr-2">{liquidity}</span>
          <PositionStatus position={data} />
        </div>
        <PriceRange position={data} type="horizontal" />
      </div>
      <AuthConnectButton className={classNameButton}>
        <AuthTokenButtonOf721 className={classNameButton} tokenAddress={NonfungiblePositionManager.address} contractAddress={UniswapV3Staker.address} tokenId={data.id.toString()}>
          {/* UniswapV3NonfungiblePositionManager.approve(contractAddress.UniswapV3Staker, <tokenId>) */}
          <Button
            loading={inTransaction}
            onClick={async () => {
              const txHash = await handleStakeLP({
                tokenId: data.id,
                address,
                startTime,
                endTime,
                pid: pid,
              });
              if (typeof txHash === 'string') {
                addRecordToHistory({
                  txHash,
                  type: 'AllFarms_StakedLP',
                  // tokenA_Address: leftToken.address,
                  // tokenA_Value: fee0 ? new Unit(fee0)?.toDecimalStandardUnit(undefined, leftToken.decimals) : '',
                  // tokenB_Address: rightToken.address,
                  // tokenB_Value: fee1 ? new Unit(fee1)?.toDecimalStandardUnit(undefined, leftToken.decimals) : '',
                });
              }
            }}
            className={classNameButton}
          >
            {i18n.stakeLP}
          </Button>
        </AuthTokenButtonOf721>
      </AuthConnectButton>
    </div>
  );
};

const StakeModal: React.FC<Props> = ({ address, currentIncentivePeriod: { startTime, endTime }, pid, leftToken, rightToken, fee }) => {
  const i18n = useI18n(transitions);
  const positions = usePositionsForUI();
  const navigate = useNavigate();

  const fPositions = useMemo(() => {
    return positions.filter((p) => p.address === address && p.liquidity !== '0');
  }, [positions, address]);

  const classNameLink = useMemo(() => {
    return 'font-normal font-not-italic text-14px leading-18px color-orange-normal underline mt-4 text-center cursor-pointer';
  }, []);

  const handleNavigate = useCallback(() => {
    setTokens(leftToken, rightToken);
    setCurrentFee(Number(fee));
    hidePopup();

    setTimeout(() => {
      navigate(`/pool/add_liquidity`);
    }, 50);
  }, [navigate, leftToken, rightToken]);

  if (fPositions.length === 0) {
    return (
      <div className="mt-24px min-h-318px !flex flex-col items-center justify-center">
        <img className="-mt-8 w-120px h-120px lt-mobile:w-100px lt-mobile:h-100px" src={logo} />
        <div className="text-22px leading-28px font-not-italic mt-8 lt-mobile:text-14px lt-mobile:font-normal lt-mobile:leading-18px">{i18n.null}</div>
        {/* TODO link to should be like /pool/add_liquidity?left=cfx&right=usdt */}
        <div className={cx(classNameLink, "lt-mobile:mt-36px")} onClick={handleNavigate}>
          <span>
            {compiled(i18n.provide, {
              leftToken: leftToken.symbol,
              rightToken: rightToken.symbol,
            })}
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="mt-24px lt-mobile:h-[calc(100vh-224px)] lt-mobile:overflow-auto lt-mobile:drawer-inner-scroller">
        <div className="max-h-454px min-h-318px overflow-y-auto lt-mobile:max-h-[fit-content] lt-mobile:min-h-auto">
          {fPositions.map((p) => {
            return <Position data={p} address={address} startTime={startTime} endTime={endTime} pid={pid}></Position>;
          })}
        </div>
        <div className="text-center">
          {/* TODO link to should be like /pool/add_liquidity?left=cfx&right=usdt */}
          <div className={cx(classNameLink, "lt-mobile:mt-24px lt-mobile:mb-4")} onClick={handleNavigate}>
            {compiled(i18n.more, {
              leftToken: leftToken.symbol,
              rightToken: rightToken.symbol,
            })}
          </div>
        </div>
      </div>
    );
  }
};

const showStakeLPModal = (pool: PoolType) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    subTitle: compiled(toI18n(transitions).subTitle, {
      leftToken: pool.leftToken.symbol,
      rightToken: pool.rightToken.symbol,
    }),
    ConfirmContent: (props: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px mt-6" />}>
        <StakeModal {...pool} {...props} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-466px',
    height: 'full',
  });
};

export default showStakeLPModal;

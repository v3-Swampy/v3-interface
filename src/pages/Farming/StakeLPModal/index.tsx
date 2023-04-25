import React, { useMemo, Suspense, useCallback } from 'react';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import useInTransaction from '@hooks/useInTransaction';
import { ReactComponent as LogoIcon } from '@assets/icons/logo_icon.svg';
import { usePositionsForUI, type PositionForUI } from '@service/position';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import PriceRange from '@modules/Position/PriceRange';
import { type PoolType, handleStakeLP as _handleStakeLP } from '@service/farming';
import { AuthTokenButtonOf721 } from '@modules/AuthTokenButton';
import { UniswapV3StakerFactory, NonfungiblePositionManager } from '@contracts/index';
import { useNavigate } from 'react-router-dom';
import { hidePopup } from '@components/showPopup';
import Button from '@components/Button';
import { addRecordToHistory } from '@service/history';
import { useTokenPrice } from '@service/pairs&pool';
import { trimDecimalZeros } from '@utils/numberUtils';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';

const transitions = {
  en: {
    title: 'Stake LP',
    subTitle: '{token0}/{token1} Positions (Out of range LP can not receive farming rewards)',
    liquidity: 'Liquidity:',
    stakeLP: 'Stake LP',
    more: 'Get more {token0}/{token1} LP ',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for {token0}/{token1}',
  },
  zh: {
    title: '质押 LP',
    subTitle: '{token0}/{token1} Positions (Out of range LP can not receive farming rewards)',
    liquidity: 'Liquidity:',
    stakeLP: 'Stake LP',
    more: 'Get more {token0}/{token1} LP',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for {token0}/{token1}',
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

  const { amount0, amount1, token0, token1 } = data ?? {};

  const token0Price = useTokenPrice(token0.address);
  const token1Price = useTokenPrice(token1.address);

  let liquidity = useMemo(() => {
    const token0Liquidity = token0Price && amount0 ? amount0.mul(token0Price).toDecimalStandardUnit(undefined, token0?.decimals) : '';
    const token1Liquidity = token1Price && amount1 ? amount1.mul(token1Price).toDecimalStandardUnit(undefined, token1?.decimals) : '';
    const liquidity = token0Liquidity && token1Liquidity ? `$${trimDecimalZeros(new Unit(token0Liquidity).add(token1Liquidity).toDecimalMinUnit(5))}` : '--';
    return liquidity;
  }, [token0Price, token1Price, data.amount0, data.amount1]);

  const classNameButton = useMemo(() => {
    return 'inline-flex shrink-0 items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer';
  }, []);

  return (
    <div className="rounded-4 bg-orange-light-hover p-4 flex justify-between items-center mb-4" key={data.id}>
      <div>
        <div>
          <span className="font-400 font-not-italic text-14px leading-18px color-gray-normal mr-0.5">{i18n.liquidity}</span>
          <span className="font-500 font-not-italic text-14px leading-18px color-black-normal mr-2">{liquidity}</span>
          <PositionStatus position={data} />
        </div>
        <PriceRange position={data} />
      </div>
      <AuthTokenButtonOf721
        className={classNameButton}
        tokenAddress={NonfungiblePositionManager.address}
        contractAddress={UniswapV3StakerFactory.address}
        tokenId={data.id.toString()}
      >
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

            addRecordToHistory({
              txHash,
              type: 'AllFarms_StakedLP',
              // tokenA_Address: token0.address,
              // tokenA_Value: fee0 ? new Unit(fee0)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
              // tokenB_Address: token1.address,
              // tokenB_Value: fee1 ? new Unit(fee1)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
            });
          }}
          className={classNameButton}
        >
          {i18n.stakeLP}
        </Button>
      </AuthTokenButtonOf721>
    </div>
  );
};

const StakeModal: React.FC<Props> = ({ address, currentIncentivePeriod: { startTime, endTime }, pid, token0, token1 }) => {
  const i18n = useI18n(transitions);
  const positions = usePositionsForUI();
  const navigate = useNavigate();

  const fPositions = useMemo(() => {
    return positions.filter((p) => p.address === address && p.liquidity !== '0');
  }, [positions, address]);

  const classNameLink = useMemo(() => {
    return 'font-500 font-not-italic text-14px leading-18px color-orange-normal underline mt-4 text-center cursor-pointer';
  }, []);

  const handleNavigate = useCallback(() => {
    hidePopup();

    setTimeout(() => {
      navigate(`/pool/add_liquidity`);
    }, 50);
  }, [navigate, token0, token1]);

  if (fPositions.length === 0) {
    return (
      <div className="mt-24px min-h-318px !flex flex-col items-center justify-center">
        <LogoIcon className="-mt-8"></LogoIcon>
        <div className="text-22px leading-28px font-400 font-not-italic mt-8">{i18n.null}</div>
        {/* TODO link to should be like /pool/add_liquidity?left=cfx&right=usdt */}
        <div className={classNameLink} onClick={handleNavigate}>
          <span>
            {compiled(i18n.provide, {
              token0: token0.symbol,
              token1: token1.symbol,
            })}
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="mt-24px">
        <div className="max-h-454px min-h-318px overflow-y-auto">
          {fPositions.map((p) => {
            return <Position data={p} address={address} startTime={startTime} endTime={endTime} pid={pid}></Position>;
          })}
        </div>
        <div className="text-center">
          {/* TODO link to should be like /pool/add_liquidity?left=cfx&right=usdt */}
          <div className={classNameLink} onClick={handleNavigate}>
            {compiled(i18n.more, {
              token0: token0.symbol,
              token1: token1.symbol,
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
      token0: pool.token0.symbol,
      token1: pool.token1.symbol,
    }),
    ConfirmContent: (props: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
        <StakeModal {...pool} {...props} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-466px',
  });
};

export default showStakeLPModal;

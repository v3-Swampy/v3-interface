import React, { useMemo, Suspense } from 'react';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import useInTranscation from '@hooks/useInTranscation';
import { ReactComponent as LogoIcon } from '@assets/icons/logo_icon.svg';
import { usePositionsForUI } from '@service/position';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import PriceRange from '@modules/Position/PriceRange';
import { type PoolType, handleStakeLP as _handleStakeLP } from '@service/farming';
import { AuthTokenButtonOf721 } from '@modules/AuthTokenButton';
import { UniswapV3StakerFactory, NonfungiblePositionManager } from '@contracts/index';

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

const StakeModal: React.FC<Props> = ({ address, currentIncentivePeriod: { startTime, endTime }, pid, token0, token1 }) => {
  const i18n = useI18n(transitions);
  const positions = usePositionsForUI();
  const { inTranscation, execTranscation: handleStakeLP } = useInTranscation(_handleStakeLP);

  const fPositions = useMemo(() => {
    return positions.filter((p) => p.address === address);
  }, [positions, address]);

  const classNameLink = useMemo(() => {
    return 'font-500 font-not-italic text-14px leading-18px color-orange-normal underline mt-4 text-center cursor-pointer';
  }, []);

  const classNameButton = useMemo(() => {
    return 'inline-flex shrink-0 items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer';
  }, []);

  if (fPositions.length === 0) {
    return (
      <div className="mt-24px min-h-318px !flex flex-col items-center justify-center">
        <LogoIcon className="-mt-8"></LogoIcon>
        <div className="text-22px leading-28px font-400 font-not-italic mt-8">{i18n.null}</div>
        <a className={classNameLink}>
          {compiled(i18n.provide, {
            token0: token0.symbol,
            token1: token1.symbol,
          })}
        </a>
      </div>
    );
  } else {
    return (
      <div className="mt-24px">
        <div className="max-h-454px min-h-318px overflow-y-auto">
          {fPositions.map((p) => {
            console.log(p);
            return (
              <div className="rounded-4 bg-orange-light-hover p-4 flex justify-between items-center mb-4" key={p.id}>
                <div>
                  <div>
                    <span className="font-400 font-not-italic text-14px leading-18px color-gray-normal mr-0.5">{i18n.liquidity}</span>
                    <span className="font-500 font-not-italic text-14px leading-18px color-black-normal mr-2">${p.liquidity}</span>
                    <PositionStatus position={p} />
                  </div>
                  <PriceRange position={p} />
                </div>
                <AuthTokenButtonOf721
                  className={classNameButton}
                  tokenAddress={NonfungiblePositionManager.address}
                  contractAddress={UniswapV3StakerFactory.address}
                  tokenId={p.id.toString()}
                >
                  {/* UniswapV3NonfungiblePositionManager.approve(contractAddress.UniswapV3Staker, <tokenId>) */}
                  <div
                    onClick={() =>
                      handleStakeLP({
                        tokenId: p.id,
                        address,
                        startTime,
                        endTime,
                        pid: pid,
                      })
                    }
                    className={classNameButton}
                  >
                    {i18n.stakeLP}
                  </div>
                </AuthTokenButtonOf721>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <a className={classNameLink}>
            {compiled(i18n.more, {
              token0: token0.symbol,
              token1: token1.symbol,
            })}
          </a>
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

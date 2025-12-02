import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import dayjs from 'dayjs';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import TokenPair from '@modules/Position/TokenPair';
import useI18n from '@hooks/useI18n';
import { useAccount } from '@service/account';
import { type PositionEnhanced, usePositionsForUI, useRefreshPositionsForUI, useFarmsOnly } from '@service/earn';
import { ReactComponent as PoolHandIcon } from '@assets/icons/pool_hand.svg';
import cx from 'clsx';
import { formatDisplayAmount } from '@utils/numberUtils';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';
import FarmIcon from '@assets/imgs/farm.png';
import { invertPrice, useTokenPrice } from '@service/pairs&pool';
import { useInvertedState } from '@modules/Position/invertedState';
import { BetaLpGuide } from './BetaLpGuide';

const classNames = {
  title: 'flex items-center color-gray-normal text-xs not-italic leading-24px mb-8px lt-mobile:mb-4px',
  content: 'color-black-normal text-14px font-normal not-italic leading-18px lt-mobile:text-12px lt-mobile:leading-15px',
  desc: 'color-gray-normal text-14px font-normal not-italic leading-18px lt-mobile:text-12px lt-mobile:leading-15px',
  authConnectButton:
    'flex items-center justify-center !px-6 h-8 border-2 border-solid rounded-full leading-18px font-normal whitespace-nowrap not-italic color-orange-normal cursor-pointer lt-mobile:border-1 lt-mobile:text-14px',
  splitLine: `lt-mobile:before:content-[''] lt-mobile:before:border-0 lt-mobile:before:border-l-1px lt-mobile:before:border-solid lt-mobile:before:absolute lt-mobile:before:top-2px lt-mobile:before:bottom-2px lt-mobile:relative lt-mobile:before:left-0 lt-mobile:before:border-color-orange-light`,
  poolWrapper: 'lt-mobile:mb-4 lt-mobile:rounded-14px',
  symbol: 'lt-mobile:font-normal lt-mobile:text-14px lt-mobile:leading-18px',
  fee: 'lt-mobile:h-18px lt-mobile:text-12px lt-mobile:leading-18px',
};

const transitions = {
  en: {
    pool: 'Pool',
    your_positions: 'Your Positions',
    new_positions: 'New Positions',
    positions_appear_here: 'Your active liquidity positions will appear here.',
    connect_wallet: 'Please connect your wallet to view your positions.',
    poolName: 'Pool Name',
    price: 'Price Range/Current Price',
    liquidity: 'Liquidity',
    unclaimedValue: 'Unclaimed  Value',
  },
  zh: {
    pool: '流动池',
    your_positions: '你的仓位',
    new_positions: '新仓位',
    positions_appear_here: '您的流动性仓位将在此显示。',
    connect_wallet: '请连接您的钱包以查看您的仓位。',
    poolName: 'Pool Name',
    price: 'Price Range/Current Price',
    liquidity: 'Liquidity',
    unclaimedValue: 'Unclaimed  Value',
  },
} as const;

const PositionItem: React.FC<{ positionEnhanced: PositionEnhanced }> = ({ positionEnhanced }) => {
  const position: PositionEnhanced = positionEnhanced;
  const i18n = useI18n(transitions);
  const [inverted, setInverted] = useInvertedState(position.tokenId);
  const { leftToken, rightToken, priceLowerForUI, priceUpperForUI, pool, amount0, amount1, token0, token1, unclaimedFees, unclaimedRewards, isRewardActive } = position;

  const token0Price = useTokenPrice(token0?.address);
  const token1Price = useTokenPrice(token1?.address);

  const token0Liquidity = token0Price && amount0 ? amount0.mul(token0Price).toDecimalStandardUnit(undefined, token0?.decimals) : '';
  const token1Liquidity = token1Price && amount1 ? amount1.mul(token1Price).toDecimalStandardUnit(undefined, token1?.decimals) : '';
  const liquidity =
    token0Liquidity && token1Liquidity
      ? formatDisplayAmount(new Unit(token0Liquidity).add(token1Liquidity), {
          decimals: 0,
          minNum: '0.01',
          toFixed: 2,
          unit: '$',
        })
      : undefined;

  const currentPrice = useMemo(() => {
    const priceToken = inverted ? rightToken : leftToken;
    if (!pool || !priceToken) return null;
    return formatDisplayAmount(pool.priceOf(priceToken), {
      decimals: 0,
      toFixed: 5,
      minNum: '0.00001',
    });
  }, [pool, inverted, leftToken, rightToken]);

  const leftTokenForUI = !inverted ? leftToken : rightToken;
  const rightTokenForUI = !inverted ? rightToken : leftToken;

  const [priceLowerStr, priceUpperStr] = useMemo(() => {
    const priceLower = inverted ? invertPrice(priceUpperForUI) : priceLowerForUI;
    const priceUpper = inverted ? invertPrice(priceLowerForUI) : priceUpperForUI;
    const priceLowerStr = formatDisplayAmount(priceLower, {
      decimals: 0,
      toFixed: 5,
      minNum: '0.00001',
    });
    const _priceUpperStr = formatDisplayAmount(priceUpper, {
      decimals: 0,
      toFixed: 5,
      minNum: '0.00001',
    });
    const priceUpperStr = _priceUpperStr === 'Infinity' ? '∞' : _priceUpperStr;
    return [priceLowerStr, priceUpperStr];
  }, [inverted, priceUpperForUI, priceLowerForUI]);

  const [fee0, fee1] = unclaimedFees || [undefined, undefined];
  const token0Fee = token0Price && fee0 ? fee0.mul(token0Price).toDecimalStandardUnit(undefined, token0?.decimals) : '';
  const token1Fee = token1Price && fee1 ? fee1.mul(token1Price).toDecimalStandardUnit(undefined, token1?.decimals) : '';
  const unclaimedFeesValue = token0Fee && token1Fee ? new Unit(token0Fee).add(token1Fee) : undefined;

  const unclaimedRewardValues = unclaimedRewards?.map((reward) => {
    const rewardTokenPrice = useTokenPrice(reward?.rewardTokenInfo?.address);
    if (rewardTokenPrice && reward.stakeReward.unclaimedReward) {
      return new Unit(reward.stakeReward.unclaimedReward).mul(rewardTokenPrice).div(new Unit(10).pow(reward.rewardTokenInfo?.decimals ?? 18));
    }
    return undefined;
  });

  const unclaimedRewardValue = useMemo(() => {
    if (!unclaimedRewardValues || unclaimedRewardValues.length === 0) {
      return undefined;
    }

    // 检查是否所有值都是 undefined
    const validValues = unclaimedRewardValues.filter((value) => value !== undefined);
    if (validValues.length === 0) {
      return undefined;
    }

    // 计算有效值的总和
    return validValues.reduce<Unit>((acc, curr) => {
      return acc.add(curr!);
    }, new Unit(0));
  }, [unclaimedRewardValues]);

  const unclaimedValue = useMemo(() => {
    if (unclaimedFeesValue === undefined && unclaimedRewardValue === undefined) {
      return undefined;
    }
    let total = new Unit(0);
    if (unclaimedFeesValue !== undefined) {
      total = total.add(unclaimedFeesValue as Unit);
    }
    if (unclaimedRewardValue !== undefined) {
      total = total.add(unclaimedRewardValue as Unit);
    }
    return formatDisplayAmount(total, {
      decimals: 0,
      minNum: '0.01',
      toFixed: 2,
      unit: '$',
    });
  }, [unclaimedFeesValue, unclaimedRewardValue]);

  return (
    <Link to={String(position.tokenId)} className="no-underline">
      <div
        className={`mt-20px lt-sm:mt-8px bg-orange-light-hover rounded-2xl mb-6 last:mb-0 py-4 px-6 relative grid grid-cols-24 lt-mobile:px-2 lt-mobile:border-orange-light lt-mobile:border-solid lt-mobile:border-1px ${classNames.poolWrapper}`}
      >
        <div className="col-span-6 lt-mobile:col-span-24 lt-mobile:mb-10px">
          <div className={`${classNames.title}`}>
            <span>{i18n.poolName}</span>
            {isRewardActive && <img src={FarmIcon} alt="farm" className="w-24px h-24px" />}
          </div>
          <div className={`${classNames.content} inline-flex justify-center items-center`}>
            <TokenPair position={position} symbolClassName={classNames.symbol} feeClassName={classNames.fee} />
          </div>
        </div>
        <div className="col-span-6 lt-mobile:col-span-24 flex flex-col items-center lt-mobile:items-start lt-mobile:mb-10px">
          <div className={`${classNames.title}`}>{i18n.price}</div>
          <div className={`${classNames.content} lt-mobile:flex lt-mobile:gap-2`}>
            <div className="flex items-center">
              {priceLowerStr}
              {rightTokenForUI?.symbol}
              <DoubleArrowIcon
                className="w-16px h-8px flex-shrink-0 mx-8px cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  setInverted((v) => !v);
                  e.stopPropagation();
                  return false;
                }}
              />
              {priceUpperStr}
              {rightTokenForUI?.symbol}
            </div>
            <div className={cx('text-center lt-mobile:text-left', classNames.desc)}>{`${currentPrice} ${rightTokenForUI?.symbol} per ${leftTokenForUI?.symbol}`}</div>
          </div>
        </div>
        <div className={`col-span-4 lt-mobile:col-span-8 flex flex-col items-center lt-mobile:items-start`}>
          <div className={`${classNames.title} whitespace-nowrap`}>{i18n.liquidity}</div>
          <div className={`${classNames.content}`}>{liquidity === undefined ? <Spin /> : liquidity ?? '-'}</div>
        </div>
        <div className="col-span-4 lt-mobile:col-span-8">
          <div className={`lt-mobile:flex lt-mobile:flex-col lt-mobile:items-center lt-mobile:w-fit lt-mobile:mx-auto lt-mobile:pl-3 ${classNames.splitLine}`}>
            <div className={`${classNames.title} whitespace-nowrap`}>{i18n.unclaimedValue}</div>
            <div className={cx(classNames.content)}>{unclaimedValue === undefined ? <Spin /> : unclaimedValue ?? '-'}</div>
          </div>
        </div>
        <div className="col-span-4 lt-mobile:col-span-8 flex flex-col items-center justify-center lt-mobile:block">
          <div
            className={`lt-mobile:flex lt-mobile:flex-col lt-mobile:items-end lt-mobile:justify-center lt-mobile:h-full lt-mobile:w-fit lt-mobile:ml-auto lt-mobile:pl-3 ${classNames.splitLine}`}
          >
            <PositionStatus position={position} className="lt-mobile:flex-col-reverse lt-mobile:gap-1 lt-mobile:[&>svg]:!ml-0" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const PositionsContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  const positions = usePositionsForUI();
  const [onlyFarms] = useFarmsOnly();

  const filteredPositions = onlyFarms ? positions?.filter((position) => position.isRewardActive) : positions;

  if (!account || !filteredPositions?.length) {
    return (
      <div className={cx('mt-116px lt-sm:mt-52px', !!account ? 'mb-124px lt-sm:mb-42px' : 'mb-150px lt-sm:mb-68px')}>
        <PoolHandIcon className="block mx-auto w-50.5px h-32px" />
        <p className="mt-12px lt-sm:mt-20px leading-28px text-center text-22px lt-sm:text-14px text-black-normal font-normal">
          {!account ? i18n.connect_wallet : i18n.positions_appear_here}
        </p>
        <BetaLpGuide />
      </div>
    );
  }
  return (
    <>
      {filteredPositions.map((positionEnhanced: PositionEnhanced) => (
        <PositionItem key={positionEnhanced.tokenId} positionEnhanced={positionEnhanced} />
      ))}
      <BetaLpGuide />
    </>
  );
};

let lastRefreshTime: dayjs.Dayjs | null = null;
const MyPositions: React.FC = () => {
  const refreshPositions = useRefreshPositionsForUI();
  useEffect(() => {
    if (lastRefreshTime) {
      if (dayjs().diff(lastRefreshTime, 'second') > 50) {
        lastRefreshTime = dayjs();
        refreshPositions();
      }
    } else {
      lastRefreshTime = dayjs();
    }
  }, []);

  return <PositionsContent />;
};

export default MyPositions;

import React from 'react';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import ToolTip from '@components/Tooltip';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import Corner from './Corner';
import showStakeLPModal, { ModalMode } from './StakeLPModal';

const FAKE_DATA_ALL_FARMS: Array<FarmsItemProps> = [
  {
    poolAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c100',
    tokenA: {
      name: 'USDT',
      symbol: 'USDT',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    tokenB: {
      name: 'BTC',
      symbol: 'BTC',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579',
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    },
    APRRange: [300, 500],
    TVL: '200000',
    multipier: '2.5',
    incentiveTime: '1681975298',
  },
  {
    poolAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c200',
    tokenA: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
      address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    },
    tokenB: {
      name: 'CFX',
      symbol: 'CFX',
      decimals: 18,
      logoURI: 'https://scan-icons.oss-cn-hongkong.aliyuncs.com/mainnet/net1030%3Aaavtjgz9s8jf8yg9hghwcjkwwbp167ay5ynubph265.png',
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c510',
    },
    APRRange: [600, 900],
    TVL: '800000',
    multipier: '4.5',
    incentiveTime: '1681024898',
  },
];

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    multipier: 'Multipier',
    stakeLP: 'Stake LP',
    tooltipMultipier: 'The multipier is the number of times your rewards will be multiplied.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    range: 'Range',
    tvl: 'TVL',
    multipier: 'Multipier',
    stakeLP: 'Stake LP',
    tooltipMultipier: 'The multipier is the number of times your rewards will be multiplied.',
  },
} as const;

interface FarmsItemProps {
  poolAddress: string;
  tokenA: Token;
  tokenB: Token;
  APRRange: number[];
  TVL: string;
  multipier: string;
  incentiveTime: string;
}

const AllFarmsItem: React.FC<{ data: FarmsItemProps }> = ({ data }) => {
  const i18n = useI18n(transitions);

  const className = {
    title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
    content: 'color-black-normal text-14px font-500 not-italic leading-18px',
  };

  const handleStakeLP = () => {
    console.log('handleStakeLP: ', data.poolAddress);
  };

  return (
    <div className="bg-orange-lightHover rounded-2xl mb-6 last:mb-0 flex justify-between py-4 px-8 relative">
      <Corner timestatmp={Number(data.incentiveTime)}></Corner>
      <div>
        <div className={`${className.title}`}>{i18n.poolName}</div>
        <div className={`${className.content} inline-flex justify-center items-center`}>
          <span className="mr-1">
            <img className="w-6 h-6 rounded-full" src={data.tokenA.logoURI} alt={`${data.tokenA.symbol} icon`} />
            <img className="w-6 h-6 -ml-8px rounded-full" src={data.tokenB.logoURI} alt={`${data.tokenB.symbol} icon`} />
          </span>
          <span>
            {data.tokenA.name} / {data.tokenB.name}
          </span>
        </div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.APR} {i18n.range}
        </div>
        <div className={`${className.content}`}>
          {data.APRRange[0]}% ~ {data.APRRange[1]}%
        </div>
      </div>
      <div>
        <div className={`${className.title}`}>{i18n.tvl}</div>
        <div className={`${className.content}`}>${numFormat(data.TVL)}</div>
      </div>
      <div>
        <div className={`${className.title}`}>
          {i18n.multipier}
          <ToolTip text={i18n.tooltipMultipier}>
            <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
          </ToolTip>
        </div>
        <div className="text-12px font-500 not-italic leading-15px color-green-normal flex items-center">
          <LightningIcon className="w-5 h-5 mr-0.5" />
          {data.multipier}X
        </div>
      </div>
      <div className="flex items-center">
        <div
          className="flex items-center justify-center px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer"
          onClick={() => showStakeLPModal(ModalMode.CreateLock)}
        >
          {i18n.stakeLP}
        </div>
      </div>
    </div>
  );
};

const AllFarms = () => {
  return (
    <div className="mt-6">
      {FAKE_DATA_ALL_FARMS.map((item) => (
        <AllFarmsItem key={item.poolAddress} data={item} />
      ))}
    </div>
  );
};

export default AllFarms;

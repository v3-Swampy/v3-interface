import React from 'react';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import ToolTip from '@components/Tooltip';
import Positions from './Positions';

const FAKE_DATA_MY_FARMS = [
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
    APR: 300,
    multipier: '2.5',
    staked: '200000',
    claimable: '200000',
    incentiveTime: '1681975298',
    hasPaused: true,
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
    APR: 500,
    multipier: '4.5',
    staked: '800000',
    claimable: '800000',
    incentiveTime: '1681024898',
    hasPaused: false,
  },
];

const transitions = {
  en: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Claimable',
    tooltipClaimable: 'The claimable is the amount of rewards you can claim.',
  },
  zh: {
    poolName: 'Pool Name',
    APR: 'APR',
    stake: 'My Staked',
    claimable: 'Claimable',
    tooltipClaimable: 'The claimable is the amount of rewards you can claim.',
  },
} as const;

interface FarmsItemProps {
  poolAddress: string;
  tokenA: Token;
  tokenB: Token;
  APR: number;
  multipier: string;
  staked: string;
  claimable: string;
  incentiveTime: string;
  hasPaused?: boolean;
}

const MyFarmsItem: React.FC<{ data: FarmsItemProps }> = ({ data }) => {
  const i18n = useI18n(transitions);
  const [isShow, setIsShow] = React.useState<boolean>(false);

  const className = {
    title: 'color-gray-normal text-xs font-400 not-italic leading-15px mb-2',
    content: 'color-black-normal text-14px font-500 not-italic leading-18px color-black-normal',
  };

  const handleShow = () => {
    setIsShow(!isShow);
  };

  return (
    <div className="bg-orange-lightHover rounded-2xl mb-6 last:mb-0 py-4 px-4 relative">
      <div className="flex justify-between relative px-4">
        <div className="ml-20px">
          <div className={`${className.title}`}>{i18n.poolName}</div>
          <div className={`${className.content} inline-flex justify-center items-center relative`}>
            {data.hasPaused && <span className="inline-block bg-orange-dot w-6px h-6px rounded-full absolute -left-14px"></span>}
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
          <div className={`${className.title}`}>{i18n.APR}</div>
          <div className={`${className.content} flex items-center`}>
            {data.APR}% <LightningIcon className="w-5 h-5 mx-0.5 ml-2" />
            {data.multipier}X
          </div>
        </div>
        <div>
          <div className={`${className.title}`}>{i18n.stake}</div>
          <div className={`${className.content}`}>$ {numFormat(data.staked)}</div>
        </div>
        <div>
          <div className={`${className.title}`}>
            {i18n.claimable}
            <ToolTip text={i18n.tooltipClaimable}>
              <span className="i-fa6-solid:circle-info ml-6px mb-1px text-13px text-gray-normal font-medium" />
            </ToolTip>
          </div>
          <div className="text-14px font-500 not-italic leading-15px flex items-center color-black-normal">{numFormat(data.claimable)} VST</div>
        </div>
        <div className="flex items-center">
          <ChevronDownIcon onClick={handleShow} className={`rotate-${isShow ? '0' : '90'} cursor-pointer`}></ChevronDownIcon>
        </div>
      </div>
      {isShow && <Positions poolAddress={data.poolAddress}></Positions>}
    </div>
  );
};

const MyFarms = () => {
  return (
    <div className="mt-6">
      {FAKE_DATA_MY_FARMS.map((item) => (
        <MyFarmsItem key={item.poolAddress} data={item} />
      ))}
    </div>
  );
};

export default MyFarms;

import React, { useRef, useCallback, useMemo } from 'react';
import useClipboard from 'react-use-clipboard';
import { FixedSizeList } from 'react-window';
import CustomScrollbar from 'custom-react-scrollbar';
import { clamp } from 'lodash-es';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Avatar from '@components/Avatar';
import Dropdown from '@components/Dropdown';
import ToolTip from '@components/Tooltip';
import Spin from '@components/Spin';
import Address from '@modules/Address';
import { useHistory, HistoryStatus, clearHistory, type HistoryRecord } from '@service/history';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { disconnect } from '@service/account';
import useI18n, { compiled } from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as CopyIcon } from '@assets/icons/copy.svg';
import { ReactComponent as ShareIcon } from '@assets/icons/share.svg';
import { ReactComponent as SuccessIcon } from '@assets/icons/success.svg';
import { ReactComponent as FailedIcon } from '@assets/icons/failed_red.svg';

const transitions = {
  en: {
    record_swapped: 'Swapped <b>{tokenAValue} {tokenASymbol}</b> for <b>{tokenBValue} {tokenBSymbol}</b>',
    record_added_liquidity: 'Add <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liqudity to the pool',
  },
  zh: {
    record_swapped: 'Swapped <b>{tokenAValue} {tokenASymbol}</b> for <b>{tokenBValue} {tokenBSymbol}</b>',
    record_added_liquidity: 'Add <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liqudity to the pool',
  },
} as const;

const HistoryTypeMap = {
  ['Swapped']: 'record_swapped',
  ['AddLiquidity']: 'record_added_liquidity',
} as Record<HistoryRecord['type'], keyof typeof transitions.en>;

const DetailContent: React.FC<{ account: string }> = ({ account }) => {
  const [isCopied, copy] = useClipboard(account, { successDuration: 1000 });

  return (
    <BorderBox variant="gradient-white" className="w-240px p-16px pt-20px rounded-28px">
      <p className="mb-16px leading-18px text-14px text-black-normal font-medium">Account</p>
      <div className="flex items-center">
        <Avatar account={account} size={24} className="mr-8px" />
        <Address address={account} className="text-14px text-black-normal font-medium" useTooltip={false} />
      </div>

      <ToolTip visible={isCopied} text="复制成功">
        <div className="mt-8px relative flex items-center pl-50px text-12px text-gray-normal font-medium cursor-pointer" onClick={copy}>
          <CopyIcon className="absolute left-32px" />
          Copy Address
        </div>
      </ToolTip>

      <a
        className="mt-10px block relative flex items-center pl-50px text-12px text-gray-normal font-medium cursor-pointer no-underline"
        target="_blank"
        rel="noopener noreferrer"
        href={`${import.meta.env.VITE_ESpaceScanUrl}/address/${account}`}
      >
        <ShareIcon className="absolute left-32px" />
        View on explorer
      </a>

      <History />
    </BorderBox>
  );
};

const History: React.FC = () => {
  const i18n = useI18n(transitions);
  const history = useHistory();
  const hasPending = history.some((item) => item.status === HistoryStatus.Pending);

  const listRef = useRef<HTMLDivElement>();
  const handleScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(({ target }) => {
    listRef.current!.scrollTo(0, (target as unknown as HTMLDivElement).scrollTop);
  }, []);

  const Record = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const record = history[index];
      const tokenA = getUnwrapperTokenByAddress(record.tokenA_Address);
      const tokenB = getUnwrapperTokenByAddress(record.tokenB_Address);

      return (
        <a
          className="block h-46px flex items-center rounded-10px hover:bg-orange-light cursor-pointer transition-colors no-underline"
          style={style}
          target="_blank"
          rel="noopener noreferrer"
          href={`${import.meta.env.VITE_ESpaceScanUrl}/tx/${record.txHash}`}
        >
          <div className={'flex items-center h-36px px-8px pr-28px'}>
            {tokenA && !tokenB && <img className="w-24px h-24px mr-8px flex-shrink-0 flex-grow-0" src={tokenA.logoURI} alt={`${tokenA.symbol} logo`} />}
            {tokenA && tokenB && (
              <>
                <img className="w-16px h-16px -mr-8px mb-4px flex-shrink-0 flex-grow-0" src={tokenA.logoURI} alt={`${tokenA.symbol} logo`} />
                <img className="w-16px h-16px mr-8px mt-4px flex-shrink-0 flex-grow-0" src={tokenB.logoURI} alt={`${tokenB.symbol} logo`} />
              </>
            )}
            <span
              className="history-record text-12px text-gray-normal flex-shrink-1 flex-grow-1"
              dangerouslySetInnerHTML={{
                __html: compiled(i18n[HistoryTypeMap[record.type]], {
                  tokenAValue: trimDecimalZeros(record.tokenA_Value),
                  tokenASymbol: tokenA?.symbol ?? '',
                  tokenBValue: trimDecimalZeros(record.tokenB_Value ? Number(record.tokenB_Value).toFixed(4) : ''),
                  tokenBSymbol: tokenB?.symbol ?? '',
                }),
              }}
            />

            {record.status === HistoryStatus.Success && <SuccessIcon className="absolute right-12px -translate-y-2px w-14px h-10px flex-shrink-0 flex-grow-0 text-red-200" />}
            {record.status === HistoryStatus.Failed && <FailedIcon className="absolute right-12px -translate-y-2px w-12px h-12px flex-shrink-0 flex-grow-0 text-red-200" />}
            {record.status === HistoryStatus.Pending && <Spin className="!absolute right-12px -translate-y-2px text-16px text-black-normal flex-shrink-0 flex-grow-0" />}
          </div>
        </a>
      );
    },
    [history, i18n]
  );

  const height = useMemo(() => clamp(history.length, 0, 4) * 46, [history]);
  return (
    <>
      <div className="mt-26px mb-16px flex items-center">
        <span className="text-14px text-black-normal font-medium">Transactions</span>
        {hasPending && (
          <span className="ml-4px inline-block flex justify-center items-center w-20px h-20px rounded-4px bg-orange-light">
            <Spin className="text-12px text-orange-normal" />
          </span>
        )}

        <Button variant="text" color="orange" className="ml-auto text-14px h-24px rounded-2px" onClick={clearHistory}>
          Clear All
        </Button>
      </div>
      <CustomScrollbar className="max-h-294px" onScroll={handleScroll}>
        {history.length === 0 && <p className="leading-46px text-center text-12px text-black-light font-medium">No transcation history</p>}
        <FixedSizeList width="100%" height={height} itemCount={history.length} itemSize={46} ref={listRef as any} style={{ overflow: undefined }}>
          {Record}
        </FixedSizeList>
      </CustomScrollbar>

      <Button variant="outlined" color="gray" fullWidth className="mt-16px h-40px text-14px rounded-100px" onClick={disconnect}>
        Disconnect
      </Button>
    </>
  );
};

const AccountDetailDropdown: React.FC<{ account: string }> = ({ account }) => {
  const history = useHistory();
  const pendingCount = history.filter((item) => item.status === 'Pending').length;

  return (
    <Dropdown placement="bottom" trigger="click" Content={<DetailContent account={account} />}>
      <BorderBox
        variant="gradient-white"
        className="relative flex-shrink-0 min-w-140px h-40px px-8px rounded-100px inline-flex justify-center items-center cursor-pointer overflow-hidden"
      >
        {!pendingCount ? (
          <>
            <Avatar account={account} size={24} className="mr-8px" />
            <Address address={account} className="text-14px text-black-normal font-medium" useTooltip={false} />
          </>
        ) : (
          <Button color="gradient" className="absolute w-full h-40px rounded-100px pointer-events-none">
            {pendingCount} Pending <Spin className="ml-8px text-16px" />
          </Button>
        )}
      </BorderBox>
    </Dropdown>
  );
};

export default AccountDetailDropdown;

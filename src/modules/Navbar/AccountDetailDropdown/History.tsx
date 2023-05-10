import React, { useCallback, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import cx from 'clsx';
import CustomScrollbar from 'custom-react-scrollbar';
import { clamp } from 'lodash-es';
import Button from '@components/Button';
import Spin from '@components/Spin';
import { useHistory, HistoryStatus, clearHistory, type HistoryRecord } from '@service/history';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import useI18n, { compiled } from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as SuccessIcon } from '@assets/icons/success.svg';
import { ReactComponent as FailedIcon } from '@assets/icons/failed_red.svg';
import { useRefreshPositions } from '@service/position';
import { useRefreshStakedTokenIds, useRefreshMyFarmsListQuery } from '@service/farming/myFarms';
import { useRefreshUserInfo, useRefreshBalanceOfveVST, useRefreshTotalStakedVST } from '@service/staking';
import { useRefreshPoolsQuery } from '@service/farming';

export const transitions = {
  en: {
    swap: 'Swapped <b>{tokenAValue} {tokenASymbol}</b> for <b>{tokenBValue} {tokenBSymbol}</b>',
    position_add_liquidity: 'Add <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liquidity to the pool',
    position_increase_liquidity: 'Increase <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liquidity to the pool',
    position_collect_fees: 'Collect <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b>',
    stake_create_lock: 'Stake {tokenAValue} {tokenASymbol}',
    stake_increase_unlock_time: 'Increase unlock time',
    stake_increase_amount: 'Increase staked amount {tokenAValue} {tokenASymbol}',
    remove_liquidity: 'Remove liquidity',
    stake_lp_of_all_farms: 'Stake LP',
    claim_and_unstake_lp_of_my_farms: 'Claim & Unstake',
    claim_and_stake_lp_of_my_farms: 'Claim & Stake to New',
    claim_lp_of_my_farms: 'Claim Reward',
    unstake_lp_of_my_farms: 'Unstake',
    stake_unlock: 'Unlock {tokenASymbol}',
  },
  zh: {
    swap: 'Swapped <b>{tokenAValue} {tokenASymbol}</b> for <b>{tokenBValue} {tokenBSymbol}</b>',
    position_add_liquidity: 'Add <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liquidity to the pool',
    position_increase_liquidity: 'Increase <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b> liquidity to the pool',
    position_collect_fees: 'Collect <b>{tokenAValue} {tokenASymbol}</b> and <b>{tokenBValue} {tokenBSymbol}</b>',
    stake_create_lock: 'Stake {tokenAValue} {tokenASymbol}',
    stake_increase_unlock_time: 'Increase unlock time {tokenAValue}',
    stake_increase_amount: 'Increase staked {tokenAValue} {tokenASymbol}',
    remove_liquidity: 'Remove liquidity',
    stake_lp_of_all_farms: 'Stake LP',
    claim_and_unstake_lp_of_my_farms: 'Claim & Unstake',
    claim_and_stake_lp_of_my_farms: 'Claim & Stake to New',
    claim_lp_of_my_farms: 'Claim Reward',
    unstake_lp_of_my_farms: 'Unstake',
    stake_unlock: 'Unlock {tokenASymbol}',
  },
} as const;

export const TransitionsTypeMap = {
  ['Swap']: 'swap',
  ['Position_AddLiquidity']: 'position_add_liquidity',
  ['Position_IncreaseLiquidity']: 'position_increase_liquidity',
  ['Position_CollectFees']: 'position_collect_fees',
  ['Stake_CreateLock']: 'stake_create_lock',
  ['Stake_IncreaseUnlockTime']: 'stake_increase_unlock_time',
  ['Stake_IncreaseAmount']: 'stake_increase_amount',
  ['Position_RemoveLiquidity']: 'remove_liquidity',
  ['AllFarms_StakedLP']: 'stake_lp_of_all_farms',
  ['MyFarms_ClaimAndUnstake']: 'claim_and_unstake_lp_of_my_farms',
  ['MyFarms_ClaimAndStake']: 'claim_and_stake_lp_of_my_farms',
  ['MyFarms_Claim']: 'claim_lp_of_my_farms',
  ['MyFarms_Unstake']: 'unstake_lp_of_my_farms',
  ['Stake_Unlock']: 'stake_unlock',
} as Record<HistoryRecord['type'], keyof typeof transitions.en>;

/**
 * This will be called automatically by history service
 * Just fill in the refresh func corresponding to the transaction type here.
 */
export const useRefreshData = () => {
  const refreshPositions = useRefreshPositions();
  const refreshStakedTokenIds = useRefreshStakedTokenIds();
  const refreshUserInfo = useRefreshUserInfo();
  const refreshPoolsQuery = useRefreshPoolsQuery();
  const refreshMyFarmsListQuery = useRefreshMyFarmsListQuery();
  const refreshBalaceOfveVST = useRefreshBalanceOfveVST();
  const refreshTotalStakedVST = useRefreshTotalStakedVST();
  return {
    refreshPositions,
    refreshStakedTokenIds,
    refreshUserInfo,
    refreshPoolsQuery,
    refreshMyFarmsListQuery,
    refreshBalaceOfveVST,
    refreshTotalStakedVST,
  } as const;
};

type RefreshKey = keyof ReturnType<typeof useRefreshData>;

export const RefreshTypeMap = {
  ['Swap']: 'refreshPositions',
  ['Position_AddLiquidity']: 'refreshPositions',
  ['Position_IncreaseLiquidity']: 'refreshPositions',
  ['Stake_CreateLock']: ['refreshUserInfo', 'refreshTotalStakedVST'],
  ['Stake_IncreaseUnlockTime']: ['refreshUserInfo', 'refreshBalaceOfveVST', 'refreshTotalStakedVST'],
  ['Stake_IncreaseAmount']: ['refreshUserInfo', 'refreshBalaceOfveVST', 'refreshTotalStakedVST'],
  ['AllFarms_StakedLP']: ['refreshPoolsQuery', 'refreshPositions', 'refreshStakedTokenIds'],
  ['Position_RemoveLiquidity']: 'refreshPositions',
  ['MyFarms_ClaimAndUnstake']: 'refreshStakedTokenIds',
  ['MyFarms_ClaimAndStake']: ['refreshMyFarmsListQuery'],
  ['MyFarms_Claim']: ['refreshStakedTokenIds', 'refreshMyFarmsListQuery'],
  ['MyFarms_Unstake']: ['refreshStakedTokenIds', 'refreshMyFarmsListQuery'],
  ['Stake_Unlock']: ['refreshUserInfo', 'refreshBalaceOfveVST', 'refreshTotalStakedVST'],
  // ['Stake_IncreaseAmount']: ['refreshPositions', 'xxx]   If you want to update multiple data, just pass an array
} as Record<HistoryRecord['type'], RefreshKey | Array<RefreshKey>>;

export const RecordAction: React.FC<Omit<HistoryRecord, 'status' | 'txHash'> & { className?: string }> = ({
  className,
  type,
  tokenA_Address,
  tokenA_Value,
  tokenB_Address,
  tokenB_Value,
}) => {
  const i18n = useI18n(transitions);
  const tokenA = getUnwrapperTokenByAddress(tokenA_Address);
  const tokenB = getUnwrapperTokenByAddress(tokenB_Address);

  return (
    <span
      className={cx('history-record flex-shrink-1 flex-grow-1', className)}
      dangerouslySetInnerHTML={{
        __html: compiled(i18n[TransitionsTypeMap[type]], {
          tokenAValue: !!Number(tokenA_Value) ? trimDecimalZeros(tokenA_Value ? Number(tokenA_Value).toFixed(4) : '') : tokenA_Value ?? '',
          tokenASymbol: tokenA?.symbol ?? '',
          tokenBValue: trimDecimalZeros(tokenB_Value ? Number(tokenB_Value).toFixed(4) : ''),
          tokenBSymbol: tokenB?.symbol ?? '',
        }),
      }}
    />
  );
};

const History: React.FC = () => {
  const i18n = useI18n(transitions);
  const history = useHistory();
  const hasPending = history.some((item) => item.status === HistoryStatus.Pending);

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
            <RecordAction className="text-12px text-gray-normal " {...record} />

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
      <CustomScrollbar className="max-h-294px">
        {history.length === 0 && <p className="leading-46px text-center text-12px text-black-light font-medium">No transaction history</p>}
        <FixedSizeList width="100%" height={height} itemCount={history.length} itemSize={46} outerElementType={CustomScrollbar}>
          {Record}
        </FixedSizeList>
      </CustomScrollbar>
    </>
  );
};

export default History;

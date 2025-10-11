import React from 'react';
import cx from 'clsx';
import BorderBox from '@components/Box/BorderBox';
import Avatar from '@components/Avatar';
import Address from '@modules/Address';
import { ReactComponent as RankIcon } from '@assets/icons/rank.svg';
import type { UserData } from '@service/points';
import { useAccount } from '@service/account';

export const RankItem: React.FC<UserData & { isPinned?: boolean }> = ({ account, wPoints, fPoints, ranking, isPinned }) => {
  const _account = useAccount();
  const isMy = _account === account;
  return (
    <BorderBox
      className="
        sm:h-84px lt-sm:py-24px px-32px lt-sm:px-8px lt-sm:gap-16px
        grid grid-cols-[1.5fr_1fr_1fr] lt-sm:grid-cols-2 items-center rounded-16px
      "
      variant={isPinned ? 'gradient-white' : 'orange-light-hover'}
    >
      <div className="flex flex-col items-start gap-5px lt-sm:col-span-2">
        <span className={cx('text-12px text-gray-normal', isMy ? 'opacity-100' : 'opacity-0')}>My Points</span>
        <div className="flex items-center">
          <span className="w-24px h-24px flex justify-center items-center mr-4px text-14px font-medium text-gray-normal">
            {typeof ranking === 'number' && ranking <= 3 && (
              <RankIcon className="w-24px h-24px -translate-y-1px" color={ranking === 1 ? '#FFC501' : ranking === 2 ? '#A5B6B7' : '#EF833A'} />
            )}
            {typeof ranking === 'number' && ranking > 3 && `${ranking}`}
            {typeof ranking !== 'number' && '-'}
          </span>
          {!!account ? <Avatar account={account} size={24} className="mr-8px" /> : null}
          {!!account ? <Address address={account} className="text-14px text-black-normal font-normal" useTooltip /> : null}
        </div>
      </div>
      <div className="flex flex-col items-start gap-5px">
        <span className="text-12px text-gray-normal">W Points</span>
        <span className="text-14px text-black-normal font-medium">{wPoints ?? '-'}</span>
      </div>
      <div className="flex flex-col items-start gap-5px border-0 lt-sm:border-l-2px lt-sm:border-solid lt-sm:border-orange-light lt-sm:pl-8px">
        <span className="text-12px text-gray-normal">F Points</span>
        <span className="text-14px text-black-normal font-medium">{fPoints ?? '-'}</span>
      </div>
    </BorderBox>
  );
};

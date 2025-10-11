import { useUserRank } from '@service/points';
import { RankItem } from './RankItem';
import React, { Suspense } from 'react';
import { useAccount } from '@service/account';

const UserPointPlaceholder: React.FC<{ account: string }> = ({ account }) => {
  return <RankItem account={account} wPoints={undefined} fPoints={undefined} isPinned />;
};

const UserPointContent: React.FC<{ limit: number; sortField: string }> = ({ limit, sortField }) => {
  const userPoint = useUserRank(limit, sortField);
  if (!userPoint) return null;
  return <RankItem {...userPoint} isPinned />;
};

export const UserPoint: React.FC<{ limit: number; sortField: string }> = (props) => {
  const account = useAccount();
  if (!account) return null;
  return (
    <Suspense fallback={<UserPointPlaceholder account={account} />}>
      <UserPointContent {...props} />
    </Suspense>
  );
};

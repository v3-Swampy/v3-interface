import { usePointRank } from '@service/points';
import { RankItem } from './RankItem';
import { UserPoint } from './UserPoint';

export const PointRank: React.FC<{ limit: number; sortField: string }> = ({ limit, sortField }) => {
  const rank = usePointRank(limit, sortField);
  return (
    <>
      <UserPoint limit={limit} sortField={sortField} />
      {rank.data?.map((item) => (
        <RankItem key={item.account ?? 'my-account'} {...item} />
      ))}
    </>
  );
};

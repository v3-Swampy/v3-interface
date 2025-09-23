import React, { useMemo } from 'react';
import { useUserData } from '../fetchData';
import { RankItem } from '../index';

const WRank: React.FC = () => {
  const data = useUserData(20, 'trade');

  return (
    <>
      {data?.map((item) => (
        <RankItem key={item.account} {...item} />
      ))}
    </>
  );
};

export default WRank;

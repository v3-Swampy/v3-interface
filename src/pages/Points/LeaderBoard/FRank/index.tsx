import React from 'react';
import { useUserData } from '../fetchData';
import { RankItem } from '../index';

const FRank: React.FC = () => {
  const data = useUserData(20, 'liquidity');

  return (
    <>
      {data?.map((item) => (
        <RankItem key={item.account} {...item} />
      ))}
    </>
  );
};

export default FRank;

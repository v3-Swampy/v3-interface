import React from 'react';
import Spin from '@components/Spin';
import { useUserData } from '../fetchData';
import { RankItem } from '../index';

const WRank: React.FC = () => {
  const { data } = useUserData(20, 'trade');
  return (
    <>
      {data === undefined && <Spin className="my-[48px] text-48px self-center" />}
      {data?.map((item) => (
        <RankItem key={item.account ?? 'my-account'} {...item} />
      ))}
    </>
  );
};

export default WRank;

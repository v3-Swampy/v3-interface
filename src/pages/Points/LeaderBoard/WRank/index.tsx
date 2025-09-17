import React, { useMemo } from 'react';
import { myData,rankData } from '../fakerData';
import { RankItem } from '../index';

const WRank: React.FC = () => {
  const data = useMemo(() =>  {
    const sortedRankData = rankData?.sort((a, b) => b.wPoints - a.wPoints).map((item, index) => ({ ...item, ranking: index + 1 }));
    const isMyDataInRank = sortedRankData?.find((item) => item.account === myData.account);
    const myDataWithRank = isMyDataInRank ? { ...myData, ranking: isMyDataInRank.ranking } : myData;
    return [myDataWithRank, ...sortedRankData?.filter((item) => item.account !== myData.account)];
  }, [myData, rankData]);

  return (
    <>
      {data?.map((item) => (
        <RankItem key={item.account} {...item} />
      ))}
    </>
  );
};

export default WRank;

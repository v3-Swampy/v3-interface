import React from 'react';
import { PointRank } from '../components/PointRank';

const limit = 20;
const sortField = 'liquidity';

const FRank: React.FC = () => {
  return <PointRank limit={limit} sortField={sortField} />;
};

export default FRank;

import React from 'react';
import { PointRank } from '../components/PointRank';

const limit = 20;
const sortField = 'trade';

const WRank: React.FC = () => {
  return <PointRank limit={limit} sortField={sortField} />;
};

export default WRank;

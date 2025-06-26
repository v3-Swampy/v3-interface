import { useEffect, useState } from 'react';
import { intervalFetchChain } from '@utils/fetch';

const BlockNumber = () => {
  const [blockNumber, setBlockNumber] = useState(0);
  useEffect(() => {
    intervalFetchChain(
      {
        method: 'eth_blockNumber',
      },
      {
        intervalTime: 1000,
        callback: (blockNumber: string) => {
          setBlockNumber(Number(blockNumber));
        },
      }
    );
  }, []);

  return (
    <footer className="lt-md:display-none flex justify-end w-full mx-auto xl:max-w-1232px lt-xl:px-24px">
      <div className="flex items-center text-14px text-[#8E8E8E] font-normal">
        <span className="breathing-light mr-4px" />
        {blockNumber}
      </div>
    </footer>
  );
};

export default BlockNumber;

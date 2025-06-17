import { useEffect, useState } from "react";
import { intervalFetchChain } from "@utils/fetch";

const BlockNumber = () => {
  const [blockNumber, setBlockNumber] = useState(0);
  useEffect(() => {
    intervalFetchChain({
      method: 'eth_blockNumber',
    }, {
      intervalTime: 1000,
      callback: (blockNumber: string) => {
        setBlockNumber(Number(blockNumber));
      },
    });
  }, []);

  return (
    <div className="mb-[32px] absolute bottom-0 right-24px flex items-center text-14px text-[#8E8E8E] font-medium">
      <span className="breathing-light mr-4px" />
      {blockNumber}
    </div>
  );
};

export default BlockNumber;
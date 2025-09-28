import { useEffect, useState } from 'react';
import { intervalFetchChain } from '@utils/fetch';
import { ReactComponent as EmailIcon } from '@assets/icons/email.svg';
import { ReactComponent as DiscordIcon } from '@assets/icons/discord.svg';
import { ReactComponent as XIcon } from '@assets/icons/x.svg';

const BlockNumber = () => {
  const [blockNumber, setBlockNumber] = useState(0);
  useEffect(() => {
    intervalFetchChain(
      {
        method: 'eth_blockNumber',
      },
      {
        intervalTime: 10000,
        callback: (blockNumber: string) => {
          setBlockNumber(Number(blockNumber));
        },
      }
    );
  }, []);

  return (
    <footer className="flex justify-between w-full mx-auto xl:max-w-1232px lt-xl:px-24px">
      <div className='flex items-center gap-8px'>
        <span className='lt-md:hidden text-14px leading-[20px] text-gray-normal font-medium'>Contact Us : </span>
        <a href="mailto:wallfreex@gmail.com" className='flex items-center text-14px leading-[20px] text-gray-normal font-medium no-underline'>
          <EmailIcon className='w-16px h-16px mr-4px' />
          wallfreex@gmail.com
        </a>
        <a href="https://discord.com/invite/joinwallfreex" target="_blank" rel="noopener noreferrer">
          <DiscordIcon className='w-16px h-16px translate-y-2px' />
        </a>
        <a href="https://x.com/WallFreeX" target="_blank" rel="noopener noreferrer">
          <XIcon className='w-16px h-16px translate-y-2px' />
        </a>
      </div>
      <div className="flex items-center text-14px text-[#8E8E8E] font-normal">
        <span className="breathing-light mr-4px" />
        {blockNumber}
      </div>
    </footer>
  );
};

export default BlockNumber;

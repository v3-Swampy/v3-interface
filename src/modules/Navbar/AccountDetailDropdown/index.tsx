import React from 'react';
import useClipboard from 'react-use-clipboard';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Avatar from '@components/Avatar';
import Dropdown from '@components/Dropdown';
import ToolTip from '@components/Tooltip';
import Spin from '@components/Spin';
import Address from '@modules/Address';
import { disconnect } from '@service/account';
import { useHistory } from '@service/history';
import { ReactComponent as CopyIcon } from '@assets/icons/copy.svg';
import { ReactComponent as ShareIcon } from '@assets/icons/share.svg';
import History from './History';

const DetailContent: React.FC<{ account: string }> = ({ account }) => {
  const [isCopied, copy] = useClipboard(account, { successDuration: 1000 });

  return (
    <BorderBox variant="gradient-white" className="w-240px p-16px pt-20px rounded-28px">
      <p className="mb-16px leading-18px text-14px text-black-normal font-medium">Account</p>
      <div className="flex items-center">
        <Avatar account={account} size={24} className="mr-8px" />
        <Address address={account} className="text-14px text-black-normal font-medium" useTooltip={false} />
      </div>

      <ToolTip visible={isCopied} text="复制成功">
        <div className="mt-8px relative flex items-center pl-50px text-12px text-gray-normal font-medium cursor-pointer" onClick={copy}>
          <CopyIcon className="absolute left-32px" />
          Copy Address
        </div>
      </ToolTip>

      <a
        className="mt-10px block relative flex items-center pl-50px text-12px text-gray-normal font-medium cursor-pointer no-underline"
        target="_blank"
        rel="noopener noreferrer"
        href={`${import.meta.env.VITE_ESpaceScanUrl}/address/${account}`}
      >
        <ShareIcon className="absolute left-32px" />
        View on explorer
      </a>

      <History />

      <Button className="mt-16px h-40px text-14px rounded-100px" fullWidth variant="outlined" color="gray" onClick={disconnect}>
        Disconnect
      </Button>
    </BorderBox>
  );
};

const AccountDetailDropdown: React.FC<{ account: string }> = ({ account }) => {
  const history = useHistory();
  const pendingCount = history.filter((item) => item.status === 'Pending').length;

  return (
    <Dropdown placement="bottom" trigger="click" Content={<DetailContent account={account} />}>
      <BorderBox
        variant="gradient-white"
        className="relative flex-shrink-0 min-w-140px h-40px px-8px rounded-100px inline-flex justify-center items-center cursor-pointer overflow-hidden"
      >
        {!pendingCount ? (
          <>
            <Avatar account={account} size={24} className="mr-8px" />
            <Address address={account} className="text-14px text-black-normal font-medium" useTooltip={false} />
          </>
        ) : (
          <Button color="gradient" className="absolute w-full h-40px rounded-100px pointer-events-none">
            {pendingCount} Pending <Spin className="ml-8px text-16px" />
          </Button>
        )}
      </BorderBox>
    </Dropdown>
  );
};

export default AccountDetailDropdown;

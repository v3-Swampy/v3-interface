import React, { memo, type ComponentProps } from 'react';
import Tooltip from '@components/Tooltip';
import { shortenAddress } from '@utils/addressUtils';
import { isMobile } from '@utils/is';

interface Props extends ComponentProps<'span'> {
  address: string;
  ellipsis?: boolean;
  useTooltip?: boolean;
}

const CfxAddress: React.FC<Props> = ({ address, ellipsis = true, useTooltip = !isMobile, ...props }) => {
  if (!useTooltip) return <span {...props}>{ellipsis ? shortenAddress(address) : address}</span>;
  return (
    <Tooltip text={address} delay={[444, 0]} interactive>
      <span {...props}>{ellipsis ? shortenAddress(address) : address}</span>
    </Tooltip>
  );
};

export default memo(CfxAddress);

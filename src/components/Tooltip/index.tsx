import React from 'react';
import Popper, { type Props } from '@components/Popper';
import clsx from 'clsx';

const Tooltip: React.FC<Omit<Props, 'Content'> & { text?: string }> = ({
  children,
  text,
  placement = 'top',
  animationType = 'fade',
  arrow = true,
  delay = 180,
  trigger = 'mouseenter',
  visible,
  interactive = true,
  className,
  ...props
}) => {
  return (
    <Popper
      className={clsx('max-w-[360px] px-[8px] py-[6px] rounded-[4px] bg-[rgba(34,34,34,0.90)] text-[14px] text-[#FFFDFA] leading-normal', className)}
      visible={visible}
      placement={placement}
      animationType={animationType}
      arrow={arrow}
      Content={text}
      delay={delay}
      trigger={typeof visible === 'boolean' ? undefined : trigger}
      interactive={interactive}
      {...props}
    >
      {children}
    </Popper>
  );
};

export default Tooltip;

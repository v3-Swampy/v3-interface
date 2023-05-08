import React, { useState } from 'react';
import Popper, { type Props } from '@components/Popper';
import Button from '@components/Button';

const ConfirmContent: React.FC<{ onConfirm: VoidFunction; onCancel: VoidFunction; title: string }> = ({ title, onCancel, onConfirm }) => {
  return (
    <div
      onClick={(evt) => {
        evt.stopPropagation();
      }}
    >
      <p>{title}</p>
      <div className="mt-6px flex justify-evenly">
        <Button className="w-36px h-18px rounded-4px text-12px" color="gray" onClick={onCancel}>
          No
        </Button>
        <Button className="w-36px h-18px rounded-4px text-12px" onClick={onConfirm}>
          Yes
        </Button>
      </div>
    </div>
  );
};

const ConfirmPopper: React.FC<Omit<Props, 'Content' | 'trigger'> & { onConfirm: VoidFunction; title: string }> = ({
  children,
  onConfirm,
  placement = 'top',
  animationType = 'fade',
  arrow = true,
  interactive = true,
  className,
  title,
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <Popper
      visible={visible}
      placement={placement}
      animationType={animationType}
      arrow={arrow}
      Content={<ConfirmContent title={title} onConfirm={onConfirm} onCancel={() => setVisible(false)} />}
      interactive={interactive}
      useDefaultStyle
      {...props}
    >
      <span
        className={className}
        onClick={(evt) => {
          evt.stopPropagation();
          setVisible((pre) => !pre);
        }}
      >
        {children}
      </span>
    </Popper>
  );
};

export default ConfirmPopper;

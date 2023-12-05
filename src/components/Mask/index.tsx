import { useEffect, ComponentProps } from 'react';
import { a, useTransition, type AnimatedComponent } from '@react-spring/web';
import classNames from 'clsx';
import { lock, clearBodyLocks } from '@utils/body-scroll-lock';

export interface Props extends ComponentProps<'div'> {
  open: boolean;
}

const Mask = ({ open, className, style, ...props }: Props) => {
  const transitions = useTransition(open, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    reverse: open,
    config: { clamp: true },
  });

  useEffect(() => {
    if (open) lock();
    else clearBodyLocks();
  }, [open]);

  return transitions(
    (styles, item) =>
      item && (
        <a.div
          className={classNames('fixed left-0 top-0 w-full h-full bg-#110f1b bg-opacity-80 z-[200] contain-strict', className, !open && 'pointer-events-none')}
          style={{ ...style, ...styles }}
          {...(props as AnimatedComponent<'div'>)}
        />
      )
  );
};

export default Mask;

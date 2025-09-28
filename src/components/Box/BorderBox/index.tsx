import { forwardRef, type ComponentProps } from 'react';
import cx from 'clsx';
import './index.css';

interface Props extends ComponentProps<'div'> {
  withInput?: boolean;
  variant: 'gradient-white' | 'gradient-orange-light-hover' | 'orange' | 'transparent' | 'gray' | 'orange-light-hover' | 'none';
}

const BorderBox = forwardRef<HTMLDivElement, Props>(({ children, className, variant = 'transparent', withInput, ...props }, ref) => {
  return (
    <div
      className={cx(
        'border-box',
        {
          'border-box--withInput': withInput,
          'border-box--none': variant === 'none',
          'border-box--transparent': variant === 'transparent',
          'border-box--orange': variant === 'orange',
          'border-box--gradient': variant === 'gradient-white' || variant === 'gradient-orange-light-hover',
          'border-box--gradient-white': variant === 'gradient-white',
          'border-box--gradient-orange-light-hover': variant === 'gradient-orange-light-hover',
          'border-box--gray': variant === 'gray',
          'border-box--orange-light-hover': variant === 'orange-light-hover',
        },
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
});

export default BorderBox;

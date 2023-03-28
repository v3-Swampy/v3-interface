import { type ComponentProps } from 'react';
import cx from 'clsx';
import './index.css';

const BorderBox: React.FC<ComponentProps<'div'> & { withInput?: boolean; variant: 'gradient-white' | 'gradient-orange-light-hover' | 'orange' | 'transparent' | 'none' }> = ({
  children,
  className,
  variant = 'transparent',
  withInput,
  ...props
}) => {
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
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default BorderBox;

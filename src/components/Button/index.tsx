import { createElement, forwardRef, type ReactNode, type PropsWithChildren, type ComponentProps } from 'react';
import cx from 'clsx';
import Spin from '@components/Spin';
import renderReactNode from '@utils/renderReactNode';
import './index.css';

export interface Props extends ComponentProps<'button'> {
  variant?: 'contained' | 'text' | 'outlined';
  color?: 'orange' | 'gradient' | 'orange-light';
  fullWidth?: boolean;
  loading?: boolean | 'start' | 'end';
  icon?: ReactNode;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  contentClassName?: string;
}

const Button = forwardRef<HTMLButtonElement, PropsWithChildren<Props>>(
  (
    {
      children,
      className,
      contentClassName,
      variant = 'contained',
      color = 'orange',
      disabled = false,
      fullWidth = false,
      loading = false,
      icon,
      startIcon,
      endIcon,
      ...props
    },
    _forwardRef
  ) => {
    return createElement(
      props.href ? 'a' : 'button',
      {
        className: cx(
          `button button--${variant} button--${color}`,
          fullWidth && 'button--fullWidth',
          loading === true && 'is-loading',
          disabled && 'is-disabled',
          className
        ),
        ref: _forwardRef,
        rel: props.href ?'noopener noreferrer' : undefined,
        ...props,
      },
      <>
        {startIcon && <span className="button__icon">{renderReactNode(startIcon)}</span>}
        {children && (
          <span className={cx('button__content', contentClassName)}>
            {loading === 'start' && <Spin className="mr-8px text-1.4em translate-y-[-.3em]" />}
            {children}
          </span>
        )}
        {!children && icon && <span className="button__icon">{renderReactNode(icon)}</span>}
        {endIcon && <span className="button__icon">{renderReactNode(endIcon)}</span>}
        {loading === true && <Spin className="button__loading" theme="light" />}
      </>
    );
  }
);

export default Button;

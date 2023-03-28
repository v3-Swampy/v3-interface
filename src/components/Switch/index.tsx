import React, { useRef, useCallback, forwardRef, ComponentProps } from 'react';
import cx from 'clsx';
import composeRef from '@utils/composeRef';
import { uniqueId } from 'lodash-es';
import './index.css';

interface Props extends ComponentProps<'input'> {}

const Switch = forwardRef<HTMLInputElement, Props>(({ id, disabled, className, style, onClick, ...props }, ref) => {
  const checkboxId = useRef<string>(id || uniqueId('switch'));
  const checkboxRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback<React.MouseEventHandler<any>>(
    (evt) => {
      checkboxRef.current?.blur?.();
      onClick?.(evt);
    },
    [onClick]
  );

  return (
    <label className={cx('switch inline-flex items-center', !disabled && 'cursor-pointer', className)} style={style} htmlFor={checkboxId.current} onClick={handleClick}>
      <input
        ref={composeRef([checkboxRef, ref])}
        id={checkboxId.current}
        disabled={disabled}
        {...props}
        type="checkbox"
        className="switch-input absolute w-0 h-0 pointer-events-none display-none"
      />
      <div className="switch-slider inline-flex items-center w-52px h-32px p-2px rounded-100px border-2px border-solid" />
    </label>
  );
});

export default Switch;

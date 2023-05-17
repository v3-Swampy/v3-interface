import { useRef, forwardRef, useCallback, type ReactElement, type ComponentProps } from 'react';
import composeRef from '@utils/composeRef';
import { ReactComponent as ClosedFilledIcon } from '@assets/icons/close_filled.svg';
import cx from 'clsx';
import './index.css';

const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!?.set!;

export type Props = OverWrite<
  ComponentProps<'input'>,
  {
    wrapperClassName?: string;
    clearIcon?: boolean;
  }
>;

const Input = forwardRef<HTMLInputElement, Props>(({ wrapperClassName, className, disabled, clearIcon = false, ...props }, ref) => {
  const domRef = useRef<HTMLInputElement>(null!);
  const handleClickClear = useCallback(() => {
    if (!domRef.current || disabled) return;
    setValue.call(domRef.current, String(''));
    domRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    domRef.current.focus();
  }, [disabled]);
  const preventBlur = useCallback<React.MouseEventHandler<HTMLInputElement>>((evt) => evt.preventDefault(), []);

  return (
    <div className={cx('input-wrapper', wrapperClassName)}>
      <input ref={composeRef(ref, domRef)} className={cx('input', className)} autoComplete="off" disabled={disabled} {...props} />
      {clearIcon && (
        <span className="clear-icon display-none absolute top-1/2 -translate-y-1/2 justify-center items-center right-.5em w-fit h-fit text-gray-normal">
          <span
            className={cx('w-18px h-18px lt-mobile:w-16px lt-mobile:h-16px', disabled ? 'cursor-default' : 'cursor-pointer')}
            onClick={handleClickClear}
            onMouseDown={preventBlur}>
            <ClosedFilledIcon className="w-18px h-18px lt-mobile:w-16px lt-mobile:h-16px" />
          </span>
        </span>
      )}
    </div>
  );
});

export default Input;

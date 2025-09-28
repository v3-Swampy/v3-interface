import { useRef, forwardRef, useCallback, useLayoutEffect, useState, type ComponentProps } from 'react';
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
    decimals?: number;
    preventMinus?: boolean;
    dynamicFontSize?: {
      startIndex: number;
      step: number;
      min: number | string;
    };
  }
>;

const formatDecimalInput = (value: string, decimals: number): string => {
  if (!value) return value;
  if (value === '-' || value === '.') return value;

  let cleanValue = value;
  const isNegative = value.startsWith('-');
  if (isNegative) {
    cleanValue = '-' + value.slice(1).replace(/-/g, '');
  } else {
    cleanValue = value.replace(/-/g, '');
  }

  const regex = new RegExp(`^-?\\d*\\.?\\d{0,${decimals}}$`);

  if (regex.test(cleanValue)) {
    return cleanValue;
  }

  const parts = cleanValue.split('.');
  if (parts.length === 2) {
    const integerPart = parts[0];
    const decimalPart = parts[1].substring(0, decimals);
    return `${integerPart}.${decimalPart}`;
  }

  return cleanValue;
};

export const defaultDynamicFontSize = {
  startIndex: 12,
  step: 2,
  min: '75%',
};

const Input = forwardRef<HTMLInputElement, Props>(({ wrapperClassName, className, disabled, clearIcon = false, decimals, preventMinus = false, dynamicFontSize, onChange, onKeyDown, ...props }, ref) => {
  const domRef = useRef<HTMLInputElement>(null!);
  const initialFontSizeRef = useRef<number>(0);
  const [dynamicReady, setDynamicReady] = useState(false);

  const updateDynamicFontSize = useCallback(
    (length: number) => {
      if (!dynamicFontSize || !domRef.current || initialFontSizeRef.current === 0) return;

      let fontSize = initialFontSizeRef.current;
      if (length > dynamicFontSize.startIndex) {
        const extraChars = length - dynamicFontSize.startIndex;
        fontSize = initialFontSizeRef.current - extraChars * dynamicFontSize.step;

        let minFontSize: number;
        if (typeof dynamicFontSize.min === 'string' && dynamicFontSize.min.endsWith('%')) {
          const percentage = parseFloat(dynamicFontSize.min) / 100;
          minFontSize = initialFontSizeRef.current * percentage;
        } else {
          minFontSize = Number(dynamicFontSize.min);
        }

        fontSize = Math.max(fontSize, minFontSize);
      }

      domRef.current.style.setProperty('--dynamic-font-size', `${fontSize}px`);
    },
    [dynamicFontSize]
  );

  useLayoutEffect(() => {
    if (dynamicFontSize && domRef.current && initialFontSizeRef.current === 0) {
      initialFontSizeRef.current = parseFloat(window.getComputedStyle(domRef.current).fontSize);
      const initialValue = props.value || props.defaultValue || '';
      updateDynamicFontSize(String(initialValue).length);
      setDynamicReady(true);
    }
  }, [dynamicFontSize]);

  const handleClickClear = useCallback(() => {
    if (!domRef.current || disabled) return;
    setValue.call(domRef.current, String(''));
    domRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    domRef.current.focus();
    updateDynamicFontSize(0);
  }, [disabled, updateDynamicFontSize]);

  const preventBlur = useCallback<React.MouseEventHandler<HTMLInputElement>>((evt) => evt.preventDefault(), []);

  const handleKeyDown = useCallback(
    (evt: React.KeyboardEvent<HTMLInputElement>) => {
      if (preventMinus && evt.key === '-') {
        evt.preventDefault();
        return;
      }

      onKeyDown?.(evt);
    },
    [preventMinus, onKeyDown]
  );

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      let finalValue = evt.target.value;
      
      if (preventMinus) {
        finalValue = finalValue.replace(/-/g, '');
      }
      
      if (props.type === 'number') {
        if (typeof decimals === 'number') {
          finalValue = formatDecimalInput(finalValue, decimals);
        }

        if (evt.target.value !== finalValue) {
          setValue.call(evt.target, finalValue);
          evt.target.value = finalValue;
        }
      }

      updateDynamicFontSize(finalValue?.length ?? 0);
      onChange?.(evt);
    },
    [props.type, decimals, preventMinus, onChange, updateDynamicFontSize]
  );

  return (
    <div className={cx('input-wrapper', wrapperClassName)}>
      <input
        ref={composeRef(ref, domRef)}
        className={cx('input', className, dynamicFontSize && dynamicReady && 'dynamic-font-size')}
        autoComplete="off"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        {...props}
      />
      {clearIcon && (
        <span className="clear-icon display-none absolute top-1/2 -translate-y-1/2 justify-center items-center right-.5em w-fit h-fit text-gray-normal">
          <span
            className={cx('w-18px h-18px lt-mobile:w-16px lt-mobile:h-16px', disabled ? 'cursor-default' : 'cursor-pointer')}
            onClick={handleClickClear}
            onMouseDown={preventBlur}
          >
            <ClosedFilledIcon className="w-18px h-18px lt-mobile:w-16px lt-mobile:h-16px" />
          </span>
        </span>
      )}
    </div>
  );
});

export default Input;

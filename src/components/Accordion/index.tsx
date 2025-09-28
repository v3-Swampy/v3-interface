import React, { useState, useRef, memo, useCallback, type ComponentProps, type CSSProperties, useEffect } from 'react';
import cx from 'clsx';
import { uniqueId } from 'lodash-es';
import { isFunction } from '@utils/is';
import './index.css';

interface Props extends Omit<ComponentProps<'div'>, 'children'> {
  titleClassName?: string;
  titleStyle?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  contentExpandClassName?: string;
  children: Array<React.ReactNode | ((expand: boolean) => React.ReactNode)>;
  disabled?: boolean;
  expand?: boolean;
}

const Accordion: React.FC<Props> = ({ id, titleClassName, titleStyle, contentClassName, contentExpandClassName, contentStyle, className, disabled, expand,  children, ...props }) => {
  const checkboxId = useRef<string>(id || uniqueId('accordion'));
  const [isExpand, setIsExpand] = useState(() => expand ?? false);
  const usedExpand = expand ?? isExpand;
  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => setIsExpand(evt.target.checked), []);

  useEffect(() => {
    if (disabled) {
      setIsExpand(false);
    }
  }, [disabled]);

  if (!Array.isArray(children)) return null;
  return (
    <div className={cx('accordion relative block overflow-hidden', className)} {...props}>
      <input className="accordion-input absolute w-0 h-0 pointer-events-none display-none" type="checkbox" id={checkboxId.current} checked={usedExpand} onChange={handleChange} />
      <label className={cx('accordion-title relative flex justify-between items-center cursor-ns-resize', (expand || disabled) && 'pointer-events-none', titleClassName)} style={titleStyle} htmlFor={checkboxId.current}>
        {isFunction(children[0]) ? children[0](usedExpand) : children[0]}
      </label>
      <div className={cx('accordion-content cursor-default', contentClassName, usedExpand && contentExpandClassName)} style={contentStyle}>
        {children.slice(1).map((child) => (isFunction(child) ? child(usedExpand) : child))}
      </div>
    </div>
  );
};

export default memo(Accordion);

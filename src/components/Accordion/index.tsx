import React, { useState, useRef, memo, useCallback, type ComponentProps, type CSSProperties } from 'react';
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
}

const Accordion: React.FC<Props> = ({ id, titleClassName, titleStyle, contentClassName, contentExpandClassName, contentStyle, className, children, ...props }) => {
  const checkboxId = useRef<string>(id || uniqueId('accordion'));
  const [isExpand, setIsExpand] = useState(false);
  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => setIsExpand(evt.target.checked), []);

  if (!Array.isArray(children)) return null;
  return (
    <div className={cx('accordion relative block overflow-hidden', className)} {...props}>
      <input className="accordion-input absolute w-0 h-0 pointer-events-none display-none" type="checkbox" id={checkboxId.current} defaultChecked={false} onChange={handleChange} />
      <label className={cx('accordion-title relative flex justify-between items-center cursor-ns-resize', titleClassName)} style={titleStyle} htmlFor={checkboxId.current}>
        {isFunction(children[0]) ? children[0](isExpand) : children[0]}
      </label>
      <div className={cx('accordion-content cursor-default', contentClassName, isExpand && contentExpandClassName)} style={contentStyle}>
        {children.slice(1).map((child) => (isFunction(child) ? child(isExpand) : child))}
      </div>
    </div>
  );
};

export default memo(Accordion);

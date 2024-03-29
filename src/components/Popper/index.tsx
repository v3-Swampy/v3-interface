import React, { useCallback, type CSSProperties } from 'react';
import cx from 'clsx';
import { useSpring, a } from '@react-spring/web';
import { transitionAnimation, TransitionAnimationType } from '../Animation';
import Tippy, { type TippyProps } from '@tippyjs/react/headless';
import './index.css';

interface PropsEnhance {
  Content: React.ReactNode | (() => JSX.Element);
  children?: React.ReactElement<any>;
  className?: string;
  style?: CSSProperties;
  arrow?: boolean;
  animationType?: TransitionAnimationType;
  animationDuration?: number | { enter: number; leave: number };
  sameWidth?: boolean;
  useDefaultStyle?: boolean;
}

export type Props = PropsEnhance & TippyProps;

const Popper: React.FC<Props> = ({
  children,
  Content,
  className,
  style,
  arrow,
  sameWidth,
  animation,
  animationType = 'zoom',
  animationDuration,
  appendTo = document.body,
  useDefaultStyle,
  ...props
}) => {
  const [styles, api] = useSpring(() => transitionAnimation[animationType].from);

  const onMount = useCallback(() => {
    api.start({
      ...transitionAnimation[animationType].enter,
      config: {
        mass: 1,
        tension: 600,
        friction: 25,
        clamp: false,
        duration: typeof animationDuration === 'number' ? animationDuration : animationDuration?.enter,
      },
      onRest: () => {},
    });
  }, [animationType, animationDuration]);

  const onHide = useCallback(
    ({ unmount }: { unmount: VoidFunction }) => {
      api.start({
        ...transitionAnimation[animationType].leave,
        onRest: unmount,
        config: {
          mass: 1,
          tension: 480,
          friction: 25,
          clamp: true,
          duration: typeof animationDuration === 'number' ? animationDuration : animationDuration?.leave,
        },
      });
    },
    [animationType, animationDuration]
  );

  return (
    <Tippy
      render={(attrs) => (
        <a.div
          className={
            className
              ? cx(className, 'popper')
              : typeof Content !== 'string' && typeof Content !== 'number' && typeof Content !== 'boolean' && !useDefaultStyle
              ? 'popper popper--custom'
              : 'popper popper--default'
          }
          style={{ ...style, ...styles }}
          {...attrs}
        >
          {typeof Content === 'function' ? <Content /> : Content}
          {arrow && <div data-popper-arrow className="popper-arrow" />}
        </a.div>
      )}
      appendTo={appendTo}
      {...props}
      animation={true}
      onMount={onMount}
      onHide={onHide}
      popperOptions={
        sameWidth
          ? {
              modifiers: [SameWidth],
            }
          : undefined
      }
    >
      {children}
    </Tippy>
  );
};

type PopperModifier = NonNullable<NonNullable<TippyProps['popperOptions']>['modifiers']>[number];

export const SameWidth: PopperModifier = {
  enabled: true,
  fn: ({ instance, state }) => {
    const triggerReferenceWidth = `${state.rects.reference.width}px`;

    if (state.styles.popper.width !== triggerReferenceWidth) {
      state.styles.popper.width = triggerReferenceWidth;
      instance.update();
    }
  },
  name: 'sameWidth',
  phase: 'beforeWrite',
  requires: ['computeStyles'],
};

export default Popper;

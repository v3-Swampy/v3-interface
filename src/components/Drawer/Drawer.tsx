import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { a, useSpring, config } from '@react-spring/web';
import { uniqueId } from 'lodash-es';
import Mask from '@components/Mask';
import renderReactNode from '@utils/renderReactNode';

export interface DrawerMethod {
  show: (Content: React.ReactNode, params: { canceled?: boolean; height?: number | 'full' | 'half' }) => string;
  hide: VoidFunction;
}

const Drawer = forwardRef<DrawerMethod>((_, ref) => {
  const [height, setHeight] = useState(() => globalThis.screen.availHeight + 100 - 160);
  const [Content, setContent] = useState<React.ReactNode>(null);

  const [maskOpen, setModalOpen] = useState(false);
  const [{ y }, api] = useSpring(() => ({ y: height }), [height]);

  const show = useCallback((Content: React.ReactNode, params?: { canceled?: boolean; height?: number | 'full' | 'half' }) => {
    if (params?.height === 'full') {
      setHeight(globalThis.screen.availHeight + 100 - 160);
    } else if (params?.height === 'half' || !params?.height) {
      setHeight(((globalThis.screen.availHeight + 100) * 1.2) / 2);
    } else {
      setHeight(params?.height + 100);
    }

    const key = uniqueId('drawer');
    const { canceled } = params || {};
    api.start({ y: 0, immediate: false, config: canceled ? config.wobbly : config.stiff });
    setModalOpen(true);
    if (Content) {
      setContent(Content);
    }
    return key;
  }, []);

  const hide = useCallback((velocity = 0) => {
    api.start({ y: height, immediate: false, config: { ...config.stiff, velocity } });
    setModalOpen(false);
    setContent(null);
  }, [height]);

  const bind = useDrag(
    ({ last, velocity: [, vy], direction: [, dy], movement: [, my], cancel, canceled }) => {
      if (my < -70) cancel();

      if (last) {
        my > height * 0.5 || (vy > 0.5 && dy > 0) ? hide(vy) : show(null, { canceled });
      } else api.start({ y: my, immediate: true });
    },
    { from: () => [0, y.get()], filterTaps: true, bounds: { top: 0 }, rubberband: true }
  );

  const display = y.to((py) => (py < height ? 'block' : 'none'));

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  return (
    <>
      <Mask open={maskOpen} onClick={() => history.back()} />
      <a.div
        className="fixed left-0 w-100vw h-[calc(100vh+100px)] rounded-t-24px bg-purple-dark-active touch-none z-8888 shadow-popper"
        {...bind()}
        style={{ display, bottom: `calc(-100vh + ${height - 100}px)`, y }}
      >
        {renderReactNode(Content)}
      </a.div>
    </>
  );
});

export default Drawer;
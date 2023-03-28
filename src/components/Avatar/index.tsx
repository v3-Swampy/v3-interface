import { memo, useRef, useLayoutEffect, forwardRef, type ComponentProps } from 'react';
import jazzIcon from './jazzIcon';
import composeRef from '@utils/composeRef';
import './index.css';

function removeAllChild(dom: Element | null): void {
  let child = dom?.lastElementChild;
  while (child) {
    dom?.removeChild(child);
    child = dom?.lastElementChild;
  }
}

function addressToNumber(address: string | null | undefined): number | undefined {
  if (!address) {
    return undefined;
  }
  const addr = address.slice(2, 10);
  const seed = parseInt(addr, 16);
  return seed;
}

const Avatar = forwardRef<HTMLDivElement, ComponentProps<'div'> & { account: string; size: number }>(({ account, size, ...props }, ref) => {
  const avatarContainerRef = useRef<HTMLDivElement>(null!);

  useLayoutEffect(() => {
    removeAllChild(avatarContainerRef.current);
    if (!account) return;
    const avatarDom = jazzIcon(size, addressToNumber(account));
    avatarContainerRef.current.appendChild(avatarDom);
  }, [size, account]);

  return <div className="avatar" {...props} style={{ width: size, height: size, ...props.style }} ref={composeRef(avatarContainerRef, ref)} />;
});

export default memo(Avatar);

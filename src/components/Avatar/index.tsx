import { memo, forwardRef, type ComponentProps } from 'react';
import { generateAvatarURL } from '@cfx-kit/wallet-avatar';

const Avatar = forwardRef<HTMLDivElement, ComponentProps<'div'> & { account: string; size: number }>(({ account, size, ...props }, ref) => {
  return (
    <div className="avatar" {...props} style={{ width: size, height: size, minWidth: size, ...props.style }} ref={ref}>
      {account && (
        <div className="w-full h-full rounded-[50px] overflow-hidden">
          <img className="pointer-events-none select-none" src={generateAvatarURL(account)} />
        </div>
      )}
    </div>
  );
});

export default memo(Avatar);

import { memo, useRef, forwardRef, type ComponentProps } from 'react';
import { generateAvatarURL } from '@cfx-kit/wallet-avatar';
import composeRef from '@utils/composeRef';

const Avatar = forwardRef<HTMLDivElement, ComponentProps<'div'> & { account: string; size: number }>(({ account, size, ...props }, ref) => {
  const avatarContainerRef = useRef<HTMLDivElement>(null!);

  return (
    <div className="avatar" {...props} style={{ width: size, height: size, ...props.style }} ref={composeRef(avatarContainerRef, ref)}>
      {account && (
        <div className="w-full h-full rounded-[50px] overflow-hidden">
          <img className="pointer-events-none select-none" src={generateAvatarURL(account)} />
        </div>
      )}
    </div>
  );
});

export default memo(Avatar);

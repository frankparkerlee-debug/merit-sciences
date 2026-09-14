// Vendored from magic-ui (magicui.design/r/marquee), written for Tailwind 3
// (the registry source uses v4's `gap-(--gap)` shorthand). Needs the
// `marquee` keyframes in tailwind.config.
import { type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  /** How many times the children repeat, so the loop has no visible seam. */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex gap-[var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]',
        { 'flex-row': !vertical, 'flex-col': vertical },
        className,
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn('flex shrink-0 justify-around gap-[var(--gap)]', {
              'animate-marquee flex-row': !vertical,
              'animate-marquee-vertical flex-col': vertical,
              'group-hover:[animation-play-state:paused]': pauseOnHover,
              '[animation-direction:reverse]': reverse,
              'motion-reduce:[animation:none]': true,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}

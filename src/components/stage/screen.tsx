import type { ReactNode } from 'react';
import { slideCounter } from '@/lib/stage';
import { cn } from '@/lib/utils';

type Props = {
  index: number;
  total: number;
  children: ReactNode;
  className?: string;
  tone?: 'dark' | 'cobalt';
};

// The LED screen on the stage: a 16:9 slide on wide screens, a portrait slide on phones.
// Slide text sizes use container units so the slide scales as one object.
export function Screen({ index, total, children, className, tone = 'dark' }: Props) {
  return (
    <div
      className={cn(
        '[container-type:inline-size] relative isolate aspect-[4/5] w-full max-w-[min(100%,calc((100svh-9rem)*16/9))] overflow-hidden rounded-[10px] ring-1 ring-white/10 md:aspect-video',
        'shadow-[0_40px_120px_-40px_rgb(0_62_145/0.85)]',
        tone === 'cobalt' ? 'bg-cobalt' : 'bg-black',
        className,
      )}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-[clamp(12px,3cqw,40px)] py-[clamp(8px,1.8cqw,22px)] text-[clamp(10px,1.2cqw,14px)] font-semibold tracking-[0.18em] text-white/70"
      >
        <span>RISE CREW</span>
        <span className="font-mono tracking-normal">{slideCounter(index, total)}</span>
      </div>
    </div>
  );
}

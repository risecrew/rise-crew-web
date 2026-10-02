import { cn } from '@/lib/utils';

// Wraps onto a second line on narrow screens, like a two-line passport MRZ, instead of clipping.
export function MrzLine({ value, className }: { value: string; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        'font-mono text-[clamp(9px,2.4vw,13px)] tracking-[0.2em] break-all text-ink-soft',
        className,
      )}
    >
      {value}
    </p>
  );
}

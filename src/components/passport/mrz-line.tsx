import { cn } from '@/lib/utils';

export function MrzLine({ value, className }: { value: string; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        'text-ink-soft overflow-hidden font-mono text-[clamp(9px,2.4vw,13px)] tracking-[0.2em] whitespace-nowrap',
        className,
      )}
    >
      {value}
    </p>
  );
}

import { cn } from '@/lib/utils';

type IconProps = { className?: string };

const base = 'inline-block h-[1em] w-[1em] shrink-0 fill-none stroke-current';

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
    >
      <path d="M12 4v15M6 13l6 6 6-6" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      strokeLinecap="round"
      className={cn(base, className)}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

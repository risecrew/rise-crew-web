import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// A checkbox drawn for the dark stage (the native one disappears on it): an outline box, lime with
// a check mark when ticked, and with a dash when only some of what it stands for is (the "select
// everyone" box). It is the real input underneath, so it keeps its focus ring, its keyboard
// behaviour and its place in the form; the marks are decoration. The same box as the sign-up
// form's consents.
export function Tick({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <span className="relative inline-grid size-6 shrink-0 place-items-center">
      <input
        {...props}
        type="checkbox"
        className={cn(
          'peer size-6 cursor-pointer appearance-none rounded-sm border border-white/50 bg-white/5 checked:border-lime checked:bg-lime indeterminate:border-lime indeterminate:bg-lime disabled:cursor-not-allowed disabled:opacity-40',
          className,
        )}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute size-4 text-cobalt opacity-0 peer-checked:opacity-100 peer-indeterminate:hidden"
      >
        <path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute hidden size-4 text-cobalt peer-indeterminate:block"
      >
        <path
          d="M4 8h8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

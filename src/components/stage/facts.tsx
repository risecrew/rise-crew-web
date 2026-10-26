import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A ruled fact table, the way a deck's appendix lists terms: label above, value below.
export function FactList({
  children,
  className,
  columns = 1,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2;
}) {
  return (
    <dl className={cn('grid gap-x-10', columns === 2 && 'sm:grid-cols-2', className)}>
      {children}
    </dl>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/15 py-4">
      <dt className="text-sm font-medium text-white/60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold break-keep text-white">{children}</dd>
    </div>
  );
}

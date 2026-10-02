import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Guilloche } from './guilloche';
import type { FieldLabel } from './labels';
import { MrzLine } from './mrz-line';

type DataPageProps = { children: ReactNode; className?: string; mrz?: string; columns?: 2 | 3 };

export function DataPage({ children, className, mrz, columns = 2 }: DataPageProps) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-lg border border-paper-edge bg-paper text-ink',
        className,
      )}
    >
      <Guilloche palette="blue" className="absolute inset-0 -z-10 opacity-40" />
      <dl
        className={cn(
          'grid gap-x-8 gap-y-5 p-6 md:p-8',
          columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {children}
      </dl>
      {mrz ? (
        <MrzLine value={mrz} className="border-t border-paper-edge px-6 py-3 md:px-8" />
      ) : null}
    </div>
  );
}

export function DataField({
  label,
  children,
  wide,
}: {
  label: FieldLabel;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-ink-soft uppercase">
        <span lang="ko">{label.ko}</span> / <span lang="en">{label.en}</span>
      </dt>
      <dd className="mt-1 text-lg font-semibold break-keep text-cobalt">{children}</dd>
    </div>
  );
}

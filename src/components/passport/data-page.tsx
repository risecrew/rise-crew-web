import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Guilloche } from './guilloche';
import type { FieldLabel } from './labels';
import { MrzLine } from './mrz-line';

export function DataPage({
  children,
  className,
  mrz,
}: {
  children: ReactNode;
  className?: string;
  mrz?: string;
}) {
  return (
    <div
      className={cn(
        'border-paper-edge bg-paper text-ink relative isolate overflow-hidden rounded-lg border',
        className,
      )}
    >
      <Guilloche palette="blue" className="absolute inset-0 -z-10 opacity-40" />
      <dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2 md:p-8">{children}</dl>
      {mrz ? (
        <MrzLine value={mrz} className="border-paper-edge border-t px-6 py-3 md:px-8" />
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
      <dt className="text-ink-soft text-[11px] font-medium tracking-[0.14em] uppercase">
        <span lang="ko">{label.ko}</span> / <span lang="en">{label.en}</span>
      </dt>
      <dd className="text-cobalt mt-1 text-lg font-semibold break-keep">{children}</dd>
    </div>
  );
}

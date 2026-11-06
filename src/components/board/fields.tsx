'use client';

import { useTranslations } from 'next-intl';
import { AREA, FIELD, LABEL, MESSAGE, ROW } from '@/components/teams/form-parts';

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  hint?: string;
  error?: string;
  rows?: number;
};

// One labelled box, with its hint and whatever the server said about it.
export function BoardField({ name, label, value, onChange, maxLength, hint, error, rows }: Props) {
  const t = useTranslations('Admin.board.fieldErrors');
  const id = `board-${name}`;
  const message = error ? t(error as 'required' | 'tooLong' | 'invalidDate') : null;
  const shared = {
    id,
    name,
    value,
    maxLength,
    'aria-invalid': message ? true : undefined,
    'aria-describedby': hint ? `${id}-hint` : undefined,
  } as const;
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {rows ? (
        <textarea
          {...shared}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className={AREA}
        />
      ) : (
        <input {...shared} onChange={(event) => onChange(event.target.value)} className={FIELD} />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 px-2 text-sm break-keep text-white/65">
          {hint}
        </p>
      ) : null}
      {message ? <p className={MESSAGE}>{message}</p> : null}
    </div>
  );
}

// A Korean box and its optional English twin, side by side on a wide screen.
export function BoardPair({ children }: { children: React.ReactNode }) {
  return <div className={`${ROW} grid gap-5 sm:grid-cols-2`}>{children}</div>;
}

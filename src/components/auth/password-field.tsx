'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FIELD_ERROR, FIELD_LABEL, INPUT } from './form-parts';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  error?: string | null;
};

// A password with a button to see it, which matters on a phone keyboard. Like the email field it has
// no name: a submit before the page is interactive falls back to a plain GET, and a password must
// never end up in the URL.
export function PasswordField({ id, label, value, onChange, autoComplete, hint, error }: Props) {
  const t = useTranslations('Auth.password');
  const [shown, setShown] = useState(false);
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="mt-4">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={`${INPUT} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShown((now) => !now)}
          aria-pressed={shown}
          aria-label={`${label} ${t('show')}`}
          className="absolute inset-y-0 right-2 flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-semibold text-white/85 underline underline-offset-4"
        >
          {shown ? t('hide') : t('show')}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className={FIELD_ERROR}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 px-2 text-sm break-keep text-white/75">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

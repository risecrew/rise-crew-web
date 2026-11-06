'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, PILL, SCREEN_TITLE, afterSignIn } from '@/components/auth/form-parts';
import { PasswordField } from '@/components/auth/password-field';
import type { Locale } from '@/i18n/locales';
import { passwordProblem } from '@/lib/auth/password';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

type Props = { locale: Locale; next: string; first: boolean };
type Problem = 'same' | 'stale' | 'failed';

// Where a mailed code leads, for a reset or a new address. The code has already signed the visitor
// in, so this only sets the password. Anyone else signed in to the account elsewhere is
// signed out: someone resetting a password may have lost a device or suspect another person got in.
export function ResetForm({ locale, next, first }: Props) {
  const t = useTranslations('Auth.reset');
  const pass = useTranslations('Auth.password');

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (done) doneHeading.current?.focus();
  }, [done]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const invalid = passwordProblem(password);
    if (invalid) {
      setPasswordError(pass(invalid));
      return;
    }

    setBusy(true);
    setProblem(null);
    const { auth } = createSupabaseBrowserClient();
    let error: { code?: string } | null;
    try {
      ({ error } = await auth.updateUser({ password }));
    } catch {
      error = {};
    }
    if (error) {
      setBusy(false);
      if (error.code === 'weak_password') setPasswordError(pass('invalid'));
      else if (error.code === 'same_password') setProblem('same');
      else if (error.code === 'reauthentication_needed') setProblem('stale');
      else setProblem('failed');
      return;
    }

    // The password is saved either way; a failure here must not say otherwise.
    await auth.signOut({ scope: 'others' }).catch(() => {});
    // A first password is one step of signing up, with nothing to report.
    if (first) {
      window.location.replace(afterSignIn(locale, next));
      return;
    }
    setBusy(false);
    setPassword('');
    setDone(true);
  }

  if (done) {
    return (
      <div className="w-full max-w-md">
        <h1
          ref={doneHeading}
          tabIndex={-1}
          className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.04] font-[850] text-balance break-keep focus:outline-none"
        >
          {t('doneTitle')}
        </h1>
        <p className="mt-4 text-lg break-keep text-white/85">{t('doneBody')}</p>
        {/* A full page load, so the header and the page read the session afresh. */}
        <a href={afterSignIn(locale, next)} className={cn(PILL, 'mt-8 bg-lime text-cobalt')}>
          {t('doneNext')}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className={SCREEN_TITLE}>{t(first ? 'firstTitle' : 'title')}</h1>
      <p className="mt-5 text-lg break-keep text-white/85">{t(first ? 'firstLead' : 'lead')}</p>
      {problem ? <Alert>{t(`errors.${problem}`)}</Alert> : null}

      <form noValidate onSubmit={onSubmit} className="mt-6">
        <PasswordField
          id="reset-password"
          label={t(first ? 'firstLabel' : 'passwordLabel')}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError(null);
          }}
          autoComplete="new-password"
          hint={pass('invalid')}
          error={passwordError}
        />
        <button type="submit" disabled={busy} className={cn(PILL, 'mt-4 bg-lime text-cobalt')}>
          {busy ? t('saving') : t('submit')}
        </button>
      </form>
    </div>
  );
}

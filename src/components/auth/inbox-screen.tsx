'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/i18n/locales';
import { OTP_LENGTH, RESEND_SECONDS } from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { Alert, FIELD_LABEL, INPUT, PILL } from './form-parts';

type Props = {
  locale: Locale;
  next: string;
  email: string;
  kind: 'signup' | 'reset';
  // Sends the mail again. Answers with the sentence to show if it could not.
  resend: () => Promise<string | null>;
  onChangeAddress: () => void;
};

// "Check your inbox", after a mail went out, and where its code goes. Everything happens in this one
// window: a link in a mail would open another. Both kinds go on to choose a password. Sends again once
// a minute at most, so one click cannot become a pile of emails.
export function InboxScreen({ locale, next, email, kind, resend, onChangeAddress }: Props) {
  const t = useTranslations('Auth.inbox');
  const heading = useRef<HTMLHeadingElement>(null);
  const resendAt = useRef(0);
  const inputId = useId();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // This screen replaces the form: focus goes to its heading so a screen reader announces the change.
  useEffect(() => {
    heading.current?.focus();
    resendAt.current = Date.now() + RESEND_SECONDS * 1000;
  }, []);

  // It counts down from the clock rather than by subtracting one per tick, so a tab that slept does
  // not lose time.
  const counting = secondsLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [counting]);

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifying) return;
    if (code.length !== OTP_LENGTH) {
      setProblem(t('wrongLength', { length: OTP_LENGTH }));
      return;
    }

    setVerifying(true);
    setProblem(null);
    setResent(false);
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.verifyOtp({
        email,
        token: code,
        type: kind === 'reset' ? 'recovery' : 'email',
      }));
    } catch {
      error = {};
    }
    if (!error) {
      // A full page load, so the page reads the new session. A signed-up account that already
      // finished goes straight on from there.
      const query = new URLSearchParams({ next });
      if (kind === 'signup') query.set('first', '1');
      window.location.replace(`/${locale}/reset-password?${query}`);
      return;
    }
    if (error.code === 'user_banned') {
      window.location.replace(`/${locale}/login?error=blocked`);
      return;
    }
    setVerifying(false);
    setCode('');
    setProblem(error.status === 429 ? t('tooMany') : t('wrongCode'));
  }

  async function onResend() {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setResent(false);
    setProblem(null);
    const failed = await resend();
    setResending(false);
    if (failed) {
      setProblem(failed);
      return;
    }
    setResent(true);
    setCode('');
    resendAt.current = Date.now() + RESEND_SECONDS * 1000;
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <div className="w-full max-w-sm">
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-display text-subhead text-balance break-keep focus:outline-none"
      >
        {t('title')}
      </h1>
      <p className="mt-4 text-lg break-keep text-white/85">{t('body')}</p>
      <p className="mt-1 text-lg font-semibold break-all text-white">{email}</p>
      {kind === 'reset' ? (
        <p className="mt-4 text-base break-keep text-white/75">{t('resetKnown')}</p>
      ) : null}
      <p className="mt-2 text-base break-keep text-white/75">{t('spam')}</p>
      {problem ? <Alert>{problem}</Alert> : null}

      <form noValidate onSubmit={onVerify} className="mt-8">
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {t('codeLabel')}
        </label>
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
            setProblem(null);
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          spellCheck={false}
          aria-describedby={`${inputId}-hint`}
          className={cn('mt-2 text-center font-mono text-xl tracking-[0.2em]', INPUT)}
        />
        <p id={`${inputId}-hint`} className="mt-2 px-2 text-sm break-keep text-white/75">
          {t('codeHint', { length: OTP_LENGTH })}
        </p>
        <button type="submit" disabled={verifying} className={cn(PILL, 'mt-4 bg-lime text-cobalt')}>
          {verifying ? t('verifying') : t('verify')}
        </button>
      </form>

      <div className="mt-4">
        <button
          type="button"
          onClick={onResend}
          disabled={secondsLeft > 0 || resending}
          className={cn(PILL, 'border border-white/50 text-white hover:bg-white/10')}
        >
          {secondsLeft > 0 ? t('resendIn', { seconds: secondsLeft }) : t('resend')}
        </button>
        {/* Always on the page, so a screen reader announces the text when it appears. */}
        <p role="status" className={cn('text-center text-base text-white/85', resent && 'mt-3')}>
          {resent ? t('resent') : null}
        </p>
        <button
          type="button"
          onClick={onChangeAddress}
          className="mx-auto mt-5 flex min-h-11 items-center text-base text-white underline underline-offset-4"
        >
          {t('change')}
        </button>
      </div>
    </div>
  );
}

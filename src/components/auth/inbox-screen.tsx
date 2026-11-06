'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/locales';
import { RESEND_SECONDS } from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { Alert, PILL, afterSignIn } from './form-parts';

type Props = {
  locale: Locale;
  next: string;
  email: string;
  kind: 'signup' | 'reset';
  // Sends the mail again. Answers with the sentence to show if it could not.
  resend: () => Promise<string | null>;
  onChangeAddress: () => void;
};

// "Check your inbox", after a mail went out. Sends again once a minute at most, so one click cannot
// become a pile of emails.
export function InboxScreen({ locale, next, email, kind, resend, onChangeAddress }: Props) {
  const t = useTranslations('Auth.inbox');
  const heading = useRef<HTMLHeadingElement>(null);
  const resendAt = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false);
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

  // The confirmation link usually opens in a new tab of this same browser, which signs in there and
  // leaves this tab waiting. The session cookies are shared, so this tab sees them appear and moves
  // on too. Only a new session counts: one this browser already had must not end the wait. Reading
  // the cookies decides nothing but where to go; the page there checks the session itself.
  useEffect(() => {
    if (kind !== 'signup') return;
    const { auth } = createSupabaseBrowserClient();
    const currentToken = () =>
      auth.getSession().then(
        ({ data }) => data.session?.access_token ?? null,
        () => null,
      );
    const before = currentToken();
    let done = false;

    const check = async () => {
      const [had, now] = await Promise.all([before, currentToken()]);
      if (done || !now || now === had) return;
      done = true;
      window.location.replace(afterSignIn(locale, next));
    };

    // A phone stops the timer of a tab in the background, so coming back to the tab checks as well.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const timer = window.setInterval(check, 2000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    return () => {
      done = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
    };
  }, [kind, locale, next]);

  async function onResend() {
    if (busy || secondsLeft > 0) return;
    setBusy(true);
    setResent(false);
    setProblem(null);
    const failed = await resend();
    setBusy(false);
    if (failed) {
      setProblem(failed);
      return;
    }
    setResent(true);
    resendAt.current = Date.now() + RESEND_SECONDS * 1000;
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <div className="w-full max-w-md">
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.04] font-[850] text-balance break-keep focus:outline-none"
      >
        {t('title')}
      </h1>
      <p className="mt-4 text-lg break-keep text-white/85">
        {t(kind === 'signup' ? 'signupBody' : 'resetBody')}
      </p>
      <p className="mt-1 text-lg font-semibold break-all text-white">{email}</p>
      <p className="mt-4 text-base break-keep text-white/75">
        {t(kind === 'signup' ? 'signupKnown' : 'resetKnown')}
      </p>
      <p className="mt-2 text-base break-keep text-white/75">{t('spam')}</p>
      {problem ? <Alert>{problem}</Alert> : null}
      <div className="mt-8">
        <button
          type="button"
          onClick={onResend}
          disabled={secondsLeft > 0 || busy}
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

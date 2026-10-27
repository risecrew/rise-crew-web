'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/i18n/locales';
import {
  RESEND_SECONDS,
  callbackUrl,
  confirmUrl,
  isEmailAddress,
  type LoginNotice,
} from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

type Props = {
  locale: Locale;
  // Where to go after signing in. The page has already vetted it.
  next: string;
  // A message the address asked for (`?error=...`), or the reason an account cannot sign in.
  notice: LoginNotice | null;
  // A blocked account still holds a session in this browser; it is ended here.
  endSession: boolean;
};

type Notice = LoginNotice | 'sendFailed' | 'tooMany';

const PILL =
  'inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60';

export function LoginForm({ locale, next, notice: initialNotice, endSession }: Props) {
  const t = useTranslations('Auth.login');

  const [email, setEmail] = useState('');
  // The address a link was sent to; the screen shows "check your inbox" once there is one.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(initialNotice);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [resent, setResent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resendAt = useRef(0);

  // A blocked account is shown as signed out, so the browser stops holding its session too. This
  // only clears the cookies here; the server already refuses the account.
  useEffect(() => {
    if (!endSession) return;
    createSupabaseBrowserClient()
      .auth.signOut({ scope: 'local' })
      .catch(() => {});
  }, [endSession]);

  // Coming back to this page with the browser's back button can restore it as it was left, with
  // the Google button still busy. A page restored from the cache gets its button back.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  // The wait before "send again" works again. It counts down from the clock rather than by
  // subtracting one per tick, so a tab that slept does not lose time.
  const counting = secondsLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [counting]);

  // Moves to the "check your inbox" screen: focus goes to its heading so that a screen reader
  // announces the change.
  useEffect(() => {
    if (sentTo !== null) headingRef.current?.focus();
  }, [sentTo]);

  async function sendLink(address: string): Promise<boolean> {
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: confirmUrl(window.location.origin, locale, next) },
      }));
    } catch {
      error = {};
    }
    if (error) {
      setNotice(
        error.status === 429 || error.code === 'over_email_send_rate_limit'
          ? 'tooMany'
          : 'sendFailed',
      );
      return false;
    }
    resendAt.current = Date.now() + RESEND_SECONDS * 1000;
    setSecondsLeft(RESEND_SECONDS);
    setNotice(null);
    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const address = email.trim();
    if (!isEmailAddress(address)) {
      setFieldError(true);
      emailRef.current?.focus();
      return;
    }

    setBusy('email');
    setNotice(null);
    const sent = await sendLink(address);
    setBusy(null);
    if (sent) {
      setEmail(address);
      setSentTo(address);
    }
  }

  async function onResend() {
    if (busy || sentTo === null || secondsLeft > 0) return;
    setBusy('email');
    setResent(false);
    const sent = await sendLink(sentTo);
    setBusy(null);
    setResent(sent);
  }

  function changeAddress() {
    setSentTo(null);
    setResent(false);
    setNotice(null);
    setSecondsLeft(0);
    // The input is back on screen after this render.
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }

  async function continueWithGoogle() {
    if (busy) return;
    setBusy('google');
    setNotice(null);
    let failed = false;
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl(window.location.origin, locale, next) },
      });
      failed = error !== null;
    } catch {
      failed = true;
    }
    // Without a failure the browser is already on its way to Google.
    if (failed) {
      setBusy(null);
      setNotice('oauth');
    }
  }

  const message =
    notice === null
      ? null
      : notice === 'sendFailed' || notice === 'tooMany'
        ? t(notice)
        : t(`errors.${notice}`);
  const alert = message ? (
    <p
      role="alert"
      className="mt-6 rounded-lg border border-white/25 px-4 py-3 text-base text-pretty break-keep text-white"
    >
      {message}
    </p>
  ) : null;

  if (sentTo !== null) {
    return (
      <div className="w-full max-w-md">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.04] font-[850] text-balance break-keep focus:outline-none"
        >
          {t('sent.title')}
        </h1>
        <p className="mt-4 text-lg break-keep text-white/85">{t('sent.body')}</p>
        <p className="mt-1 text-lg font-semibold break-all text-white">{sentTo}</p>
        <p className="mt-4 text-base break-keep text-white/75">{t('sent.spam')}</p>
        {alert}
        <div className="mt-8">
          <button
            type="button"
            onClick={onResend}
            disabled={secondsLeft > 0 || busy !== null}
            className={cn(PILL, 'border border-white/25 text-white hover:bg-white/10')}
          >
            {secondsLeft > 0 ? t('sent.resendIn', { seconds: secondsLeft }) : t('sent.resend')}
          </button>
          {/* Always on the page, so a screen reader announces the text when it appears. */}
          <p role="status" className={cn('text-center text-base text-white/85', resent && 'mt-3')}>
            {resent ? t('sent.resent') : null}
          </p>
          <button
            type="button"
            onClick={changeAddress}
            className="mx-auto mt-5 block text-base text-white underline underline-offset-4"
          >
            {t('sent.change')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-[clamp(3.25rem,9vw,6rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance break-keep">
        {t('title')}
      </h1>
      <p className="mt-5 text-lg break-keep text-white/85">{t('lead')}</p>
      {alert}

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy !== null}
        className={cn(PILL, 'mt-10 bg-white text-stage')}
      >
        {t('google')}
      </button>

      <div className="my-6 flex items-center gap-4 text-sm text-white/60">
        <span aria-hidden className="h-px flex-1 bg-white/15" />
        {t('or')}
        <span aria-hidden className="h-px flex-1 bg-white/15" />
      </div>

      {/* The input has no name on purpose: a submit that happens before this page is interactive
          falls back to a plain GET, and the address must not end up in the URL. */}
      <form noValidate onSubmit={onSubmit}>
        <label htmlFor="login-email" className="block text-sm font-medium text-white/75">
          {t('emailLabel')}
        </label>
        <input
          ref={emailRef}
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError(false);
          }}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          placeholder={t('emailPlaceholder')}
          aria-invalid={fieldError}
          aria-describedby={fieldError ? 'login-email-error' : undefined}
          className="mt-2 w-full rounded-full border border-white/50 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/55 aria-invalid:border-white"
        />
        {fieldError ? (
          <p id="login-email-error" className="mt-2 px-2 text-base break-keep text-white">
            {t('emailInvalid')}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy !== null}
          className={cn(PILL, 'mt-4 bg-lime text-cobalt')}
        >
          {busy === 'email' ? t('sending') : t('submit')}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  FIELD_ERROR,
  FIELD_LABEL,
  INLINE_LINK,
  INPUT,
  PILL,
  SCREEN_TITLE,
  afterSignIn,
  withNext,
} from '@/components/auth/form-parts';
import { GoogleButton } from '@/components/auth/google-button';
import { InboxScreen } from '@/components/auth/inbox-screen';
import { PasswordField } from '@/components/auth/password-field';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { confirmUrl, isEmailAddress, type LoginNotice } from '@/lib/auth/login';
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

type Notice = LoginNotice | 'credentials' | 'notConfirmed' | 'failed' | 'sendFailed' | 'tooMany';

export function LoginForm({ locale, next, notice: initialNotice, endSession }: Props) {
  const t = useTranslations('Auth.login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // How many times the address has been refused since it was last edited (0 = not refused). It
  // is a count, not a flag, so that sending the same bad address again shows the message anew.
  const [emailErrors, setEmailErrors] = useState(0);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(initialNotice);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // The address a confirmation mail just went to again.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  // A blocked account is shown as signed out, so the browser stops holding its session too. This
  // only clears the cookies here; the server already refuses the account.
  useEffect(() => {
    if (!endSession) return;
    createSupabaseBrowserClient()
      .auth.signOut({ scope: 'local' })
      .catch(() => {});
  }, [endSession]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const address = email.trim();
    if (!isEmailAddress(address)) {
      setEmailErrors((count) => count + 1);
      emailRef.current?.focus();
      return;
    }
    if (password === '') {
      setPasswordError(t('passwordRequired'));
      return;
    }

    setBusy(true);
    setNotice(null);
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.signInWithPassword({
        email: address,
        password,
      }));
    } catch {
      error = {};
    }
    if (!error) {
      window.location.replace(afterSignIn(locale, next));
      return;
    }

    setBusy(false);
    setEmail(address);
    if (error.code === 'invalid_credentials') {
      setPassword('');
      setNotice('credentials');
    } else if (error.code === 'email_not_confirmed') {
      setNotice('notConfirmed');
    } else if (error.code === 'user_banned') {
      setNotice('blocked');
    } else if (error.status === 429) {
      setNotice('tooMany');
    } else {
      setNotice('failed');
    }
  }

  async function sendConfirmation(address: string): Promise<'sendFailed' | 'tooMany' | null> {
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.resend({
        type: 'signup',
        email: address,
        options: { emailRedirectTo: confirmUrl(window.location.origin, locale, next) },
      }));
    } catch {
      error = {};
    }
    if (!error) return null;
    return error.status === 429 || error.code === 'over_email_send_rate_limit'
      ? 'tooMany'
      : 'sendFailed';
  }

  async function onResendConfirmation() {
    if (busy) return;
    setBusy(true);
    const problem = await sendConfirmation(email);
    setBusy(false);
    if (problem) setNotice(problem);
    else setSentTo(email);
  }

  if (sentTo !== null) {
    return (
      <InboxScreen
        locale={locale}
        next={next}
        email={sentTo}
        kind="signup"
        resend={async () => {
          const problem = await sendConfirmation(sentTo);
          return problem ? t(`errors.${problem}`) : null;
        }}
        onChangeAddress={() => {
          setSentTo(null);
          setNotice(null);
          setPassword('');
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className={SCREEN_TITLE}>{t('title')}</h1>
      <p className="mt-5 text-lg break-keep text-white/85">{t('lead')}</p>
      {notice ? <Alert>{t(`errors.${notice}`)}</Alert> : null}
      {notice === 'notConfirmed' ? (
        <button
          type="button"
          onClick={onResendConfirmation}
          disabled={busy}
          className={INLINE_LINK}
        >
          {t('resendConfirm')}
        </button>
      ) : null}

      <GoogleButton
        locale={locale}
        next={next}
        disabled={busy}
        onStart={() => {
          setGoogleBusy(true);
          setNotice(null);
        }}
        onFail={() => {
          setGoogleBusy(false);
          setNotice('oauth');
        }}
      />

      <div className="my-6 flex items-center gap-4 text-sm text-white/60">
        <span aria-hidden className="h-px flex-1 bg-white/15" />
        {t('or')}
        <span aria-hidden className="h-px flex-1 bg-white/15" />
      </div>

      {/* The inputs have no name on purpose: a submit that happens before this page is interactive
          falls back to a plain GET, and neither may end up in the URL. */}
      <form noValidate onSubmit={onSubmit}>
        <label htmlFor="login-email" className={FIELD_LABEL}>
          {t('emailLabel')}
        </label>
        <input
          ref={emailRef}
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailErrors(0);
          }}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('emailPlaceholder')}
          aria-invalid={emailErrors > 0}
          aria-describedby={emailErrors > 0 ? 'login-email-error' : undefined}
          className={cn('mt-2', INPUT)}
        />
        {/* An alert, because focus is often on the input already (Enter, or a phone keyboard's send
            key), and moving focus to where it is says nothing. The key makes the same message a new
            element each time, which a screen reader reads out again. */}
        {emailErrors > 0 ? (
          <p key={emailErrors} id="login-email-error" role="alert" className={FIELD_ERROR}>
            {t('emailInvalid')}
          </p>
        ) : null}
        <PasswordField
          id="login-password"
          label={t('passwordLabel')}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError(null);
          }}
          autoComplete="current-password"
          error={passwordError}
        />
        <button
          type="submit"
          disabled={busy || googleBusy}
          className={cn(PILL, 'mt-4 bg-lime text-cobalt')}
        >
          {busy ? t('signingIn') : t('submit')}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4">
        <Link
          href={{ pathname: '/forgot-password', query: withNext(locale, next) }}
          prefetch={false}
          className={INLINE_LINK}
        >
          {t('forgot')}
        </Link>
        <p className="flex items-center gap-2 text-base text-white/75">
          {t('signupPrompt')}
          <Link
            href={{ pathname: '/signup', query: withNext(locale, next) }}
            prefetch={false}
            className={INLINE_LINK}
          >
            {t('signupLink')}
          </Link>
        </p>
      </div>

      {/* What signing up keeps before anything is agreed to, said once, quietly, under the ways in.
          The link is small text with a finger-sized target; when the sentence fills its line the
          link takes the next one rather than stretching a line in the middle of it. */}
      <p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm text-pretty break-keep text-white/75">
        <span>{t('storage')}</span>
        <Link
          href="/privacy"
          prefetch={false}
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white"
        >
          {t('policyLink')}
        </Link>
      </p>
    </div>
  );
}

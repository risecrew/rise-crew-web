'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import {
  AUTH_COLUMN,
  Alert,
  FIELD_ERROR,
  FIELD_LABEL,
  INPUT,
  PILL,
  QUIET_LINK,
} from '@/components/auth/form-parts';
import { AuthSwitch } from '@/components/auth/auth-switch';
import { GoogleButton } from '@/components/auth/google-button';
import { InboxScreen } from '@/components/auth/inbox-screen';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { isEmailAddress } from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

type Props = { locale: Locale; next: string };
type Notice = 'oauth' | 'sendFailed' | 'tooMany';

function mailProblem(error: { status?: number; code?: string }): 'sendFailed' | 'tooMany' {
  return error.status === 429 || error.code === 'over_email_send_rate_limit'
    ? 'tooMany'
    : 'sendFailed';
}

// A new account by email: the address first, and the password after the mail confirms it, because a
// password chosen before that proves nothing (see the migration that clears one). An address that
// already has an account gets the same screen and a sign-in code, so this form cannot be used to find
// out who has signed up.
export function SignupForm({ locale, next }: Props) {
  const t = useTranslations('Auth.signup');
  const login = useTranslations('Auth.login');

  const [email, setEmail] = useState('');
  const [emailErrors, setEmailErrors] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  async function send(address: string): Promise<'sendFailed' | 'tooMany' | null> {
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.signInWithOtp({ email: address }));
    } catch {
      error = {};
    }
    return error ? mailProblem(error) : null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const address = email.trim();
    if (!isEmailAddress(address)) {
      setEmailErrors((count) => count + 1);
      emailRef.current?.focus();
      return;
    }

    setBusy(true);
    setNotice(null);
    const problem = await send(address);
    setBusy(false);
    if (problem) {
      setNotice(problem);
      return;
    }
    setEmail(address);
    setSentTo(address);
  }

  if (sentTo !== null) {
    return (
      <InboxScreen
        locale={locale}
        next={next}
        email={sentTo}
        kind="signup"
        resend={async () => {
          const problem = await send(sentTo);
          return problem ? login(`errors.${problem}`) : null;
        }}
        onChangeAddress={() => {
          setSentTo(null);
          setNotice(null);
        }}
      />
    );
  }

  return (
    <div className={AUTH_COLUMN}>
      <h1 className="sr-only">{t('title')}</h1>
      <AuthSwitch locale={locale} next={next} current="signup" />
      {notice ? <Alert>{login(`errors.${notice}`)}</Alert> : null}

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
        {login('or')}
        <span aria-hidden className="h-px flex-1 bg-white/15" />
      </div>

      {/* No name on the input, for the same reason as on the sign-in form. */}
      <form noValidate onSubmit={onSubmit}>
        <label htmlFor="signup-email" className={FIELD_LABEL}>
          {login('emailLabel')}
        </label>
        <input
          ref={emailRef}
          id="signup-email"
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
          placeholder={login('emailPlaceholder')}
          aria-invalid={emailErrors > 0}
          aria-describedby={
            emailErrors > 0 ? 'signup-email-error signup-email-hint' : 'signup-email-hint'
          }
          className={cn('mt-2', INPUT)}
        />
        {emailErrors > 0 ? (
          <p key={emailErrors} id="signup-email-error" role="alert" className={FIELD_ERROR}>
            {login('emailInvalid')}
          </p>
        ) : null}
        {/* What happens next, said once and quietly: the password comes after the mail. */}
        <p id="signup-email-hint" className="mt-2 px-2 text-sm break-keep text-white/75">
          {t('lead')}
        </p>
        <button
          type="submit"
          disabled={busy || googleBusy}
          className={cn(PILL, 'mt-4 bg-lime text-cobalt')}
        >
          {busy ? t('sending') : t('submit')}
        </button>
      </form>

      {/* Only the policy, small: the sign-up form itself asks for consent later. */}
      <p className="mt-6 text-center">
        <Link href="/privacy" prefetch={false} className={QUIET_LINK}>
          {login('policyLink')}
        </Link>
      </p>
    </div>
  );
}

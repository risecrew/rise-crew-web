'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  FIELD_ERROR,
  FIELD_LABEL,
  INLINE_LINK,
  INPUT,
  PILL,
  SCREEN_TITLE,
  withNext,
} from '@/components/auth/form-parts';
import { InboxScreen } from '@/components/auth/inbox-screen';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { isEmailAddress } from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

type Props = {
  locale: Locale;
  next: string;
  // Filled in for someone already signed in, who is changing their password from My page.
  email: string;
};
type Notice = 'sendFailed' | 'tooMany';

// Asks for the mail with the code that opens the new-password screen. Nothing changes until its owner
// uses the code. The screen looks the same for every address. Auth itself refuses a second request
// for a known address made too soon, which the site cannot hide, so this is no promise of secrecy.
export function ForgotForm({ locale, next, email: known }: Props) {
  const t = useTranslations('Auth.forgot');
  const login = useTranslations('Auth.login');

  const [email, setEmail] = useState(known);
  const [emailErrors, setEmailErrors] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  async function send(address: string): Promise<Notice | null> {
    let error: { status?: number; code?: string } | null;
    try {
      ({ error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(address));
    } catch {
      error = {};
    }
    if (!error) return null;
    return error.status === 429 || error.code === 'over_email_send_rate_limit'
      ? 'tooMany'
      : 'sendFailed';
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
        kind="reset"
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
    <div className="w-full max-w-md">
      <h1 className={SCREEN_TITLE}>{t('title')}</h1>
      <p className="mt-5 text-lg break-keep text-white/85">{t('lead')}</p>
      {notice ? <Alert>{login(`errors.${notice}`)}</Alert> : null}

      <form noValidate onSubmit={onSubmit} className="mt-10">
        <label htmlFor="forgot-email" className={FIELD_LABEL}>
          {login('emailLabel')}
        </label>
        <input
          ref={emailRef}
          id="forgot-email"
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
          enterKeyHint="send"
          placeholder={login('emailPlaceholder')}
          aria-invalid={emailErrors > 0}
          aria-describedby={emailErrors > 0 ? 'forgot-email-error' : undefined}
          className={cn('mt-2', INPUT)}
        />
        {emailErrors > 0 ? (
          <p key={emailErrors} id="forgot-email-error" role="alert" className={FIELD_ERROR}>
            {login('emailInvalid')}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className={cn(PILL, 'mt-4 bg-lime text-cobalt')}>
          {t('submit')}
        </button>
      </form>

      <Link
        href={{ pathname: '/login', query: withNext(locale, next) }}
        prefetch={false}
        className={cn(INLINE_LINK, 'mt-4')}
      >
        {t('back')}
      </Link>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n/locales';
import { callbackUrl } from '@/lib/auth/login';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { PILL } from './form-parts';

// Google's own "G", which their sign-in branding guidelines ask for on a custom button. It keeps
// Google's four colours (they live only in this mark) and is decoration: the label names the button.
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-[1.15em] shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type Props = {
  locale: Locale;
  next: string;
  disabled: boolean;
  onStart: () => void;
  onFail: () => void;
};

export function GoogleButton({ locale, next, disabled, onStart, onFail }: Props) {
  const t = useTranslations('Auth.login');
  const [busy, setBusy] = useState(false);

  // Coming back to this page with the browser's back button can restore it as it was left, with
  // the button still busy. A page restored from the cache gets its button back.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  async function start() {
    if (busy || disabled) return;
    setBusy(true);
    onStart();
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
      setBusy(false);
      onFail();
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy || disabled}
      className={cn(PILL, 'mt-10 gap-3 bg-white text-stage')}
    >
      <GoogleMark />
      {t('google')}
    </button>
  );
}

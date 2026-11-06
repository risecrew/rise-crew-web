import type { Locale } from '@/i18n/locales';

// The classes the sign-in, sign-up and password screens share.
export const PILL =
  'inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60';
export const INPUT =
  'w-full rounded-full border border-white/50 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/55 aria-invalid:border-white';
export const FIELD_LABEL = 'block text-sm font-medium text-white/75';
export const FIELD_ERROR = 'mt-2 px-2 text-base break-keep text-white';
export const SCREEN_TITLE =
  'font-display text-[clamp(3.25rem,9vw,6rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance break-keep';
export const INLINE_LINK =
  'inline-flex min-h-11 items-center text-base text-white underline underline-offset-4';

// Where to go once a browser holds a session. The welcome page sends a finished account straight on
// to `next`, a new one to the form, and a blocked one to the reason, so every way in ends the same.
export function afterSignIn(locale: Locale, next: string): string {
  return `/${locale}/welcome?next=${encodeURIComponent(next)}`;
}

// The links between the account screens carry where the visitor was heading.
export function withNext(locale: Locale, next: string) {
  return next === `/${locale}` ? {} : { next };
}

export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-6 rounded-lg border border-white/25 px-4 py-3 text-base text-pretty break-keep text-white"
    >
      {children}
    </p>
  );
}

'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { atLeast } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { accountLabel, getServerSnapshot, getSnapshot, subscribe } from './account-store';

export type AccountLabels = {
  signIn: string;
  account: string;
  myPage: string;
  admin: string;
  signOut: string;
};

type Tone = 'stage' | 'paper';

function useCurrentLocale(): Locale {
  const locale = useLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

// The header's entry to accounts. It is a link to the login page until the browser finds a
// session, then the first letter of the visitor's name with a menu behind it (a panel's worth of
// rows inside the phone menu). Which one shows is read in the browser, so the pages around it stay
// static; see account-store.ts. A blocked account looks signed out.
//
// `bar` is the desktop header, `panel` the paper panel of the phone menu.
export function AccountMenu({
  labels,
  variant = 'bar',
}: {
  labels: AccountLabels;
  variant?: 'bar' | 'panel';
}) {
  const account = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const locale = useCurrentLocale();

  if (account.status === 'out') return <SignInLink label={labels.signIn} variant={variant} />;

  const { name, initial } = accountLabel(account, locale);
  const staff = atLeast(account.role, 'operator');

  return variant === 'bar' ? (
    <Dropdown
      labels={labels}
      name={name}
      initial={initial}
      email={account.email}
      staff={staff}
      locale={locale}
    />
  ) : (
    <div className="mt-2 border-t border-paper-edge pt-2">
      <div className="flex items-center gap-3 px-3 py-3">
        <Circle letter={initial} tone="paper" />
        <Who name={name} email={account.email} tone="paper" />
      </div>
      <AccountLinks labels={labels} staff={staff} locale={locale} tone="paper" />
    </div>
  );
}

function SignInLink({ label, variant }: { label: string; variant: 'bar' | 'panel' }) {
  const pathname = usePathname();
  const locale = useCurrentLocale();
  // The visitor comes back to the page they were on. The login page itself has nowhere to go
  // back to, so its link carries nothing.
  const next = pathname === '/login' ? null : `/${locale}${pathname === '/' ? '' : pathname}`;

  const link = (
    <Link
      href={next ? { pathname: '/login', query: { next } } : '/login'}
      prefetch={false}
      className={
        variant === 'bar'
          ? 'underline-offset-4 hover:underline'
          : 'block rounded px-3 py-3 hover:bg-paper-edge'
      }
    >
      {label}
    </Link>
  );
  return variant === 'bar' ? (
    link
  ) : (
    <div className="mt-2 border-t border-paper-edge pt-2">{link}</div>
  );
}

// The first letter of the name in a circle. The letter is decoration for the eye; the button or
// row around it carries the name for everyone else.
function Circle({ letter, tone }: { letter: string; tone: Tone }) {
  return (
    <span
      data-account-initial
      aria-hidden
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full font-display text-base font-[800]',
        tone === 'stage' ? 'border border-white/50 text-white' : 'bg-cobalt text-white',
      )}
    >
      {letter}
    </span>
  );
}

function Who({ name, email, tone }: { name: string; email: string; tone: Tone }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold break-keep">{name}</p>
      {name !== email ? (
        <p
          className={cn('text-sm break-all', tone === 'stage' ? 'text-white/60' : 'text-ink-soft')}
        >
          {email}
        </p>
      ) : null}
    </div>
  );
}

function AccountLinks({
  labels,
  staff,
  locale,
  tone,
}: {
  labels: AccountLabels;
  staff: boolean;
  locale: Locale;
  tone: Tone;
}) {
  const row = cn(
    'block w-full rounded px-3 py-3 text-left',
    tone === 'stage' ? 'hover:bg-white/10' : 'hover:bg-paper-edge',
  );
  return (
    <ul>
      <li>
        <Link href="/me" prefetch={false} className={row}>
          {labels.myPage}
        </Link>
      </li>
      {staff ? (
        <li>
          <Link href="/admin/members" prefetch={false} className={row}>
            {labels.admin}
          </Link>
        </li>
      ) : null}
      <li>
        {/* A plain form, so signing out works before the page has finished loading. Only a POST
            signs anyone out. */}
        <form method="post" action={`/${locale}/auth/signout`}>
          <button type="submit" className={row}>
            {labels.signOut}
          </button>
        </form>
      </li>
    </ul>
  );
}

function Dropdown({
  labels,
  name,
  initial,
  email,
  staff,
  locale,
}: {
  labels: AccountLabels;
  name: string;
  initial: string;
  email: string;
  staff: boolean;
  locale: Locale;
}) {
  const pathname = usePathname();
  // Open for the page it was opened on: going to another page closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpenAt(null);
    const outside = (event: Event) => !rootRef.current?.contains(event.target as Node);
    const onPointerDown = (event: PointerEvent) => {
      if (outside(event)) close();
    };
    // Tabbing out of the menu closes it. Clicking inside never moves focus out, so this is not
    // fooled by browsers that do not focus a button when it is clicked.
    const onFocusIn = (event: FocusEvent) => {
      if (outside(event)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={`${name}, ${labels.account}`}
        onClick={() => setOpenAt(open ? null : pathname)}
        className="rounded-full transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <Circle letter={initial} tone="stage" />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-40 mt-3 w-64 origin-top-right animate-menu-in rounded-lg border border-white/15 bg-stage/90 p-2 text-white backdrop-blur-md motion-reduce:animate-none">
          <div className="px-3 py-3">
            <Who name={name} email={email} tone="stage" />
          </div>
          <div className="border-t border-white/15 pt-2">
            <AccountLinks labels={labels} staff={staff} locale={locale} tone="stage" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { withNext } from './form-parts';

const SEGMENT =
  'flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-base font-semibold transition-colors duration-150 ease-out';

// The two ways in, side by side at the top of the sign-in and sign-up screens. It stands where a
// title would: the screen opens on the choice itself. Each half is a link, so either screen can be
// shared or opened in a new tab, and the current one says so (aria-current).
export function AuthSwitch({
  locale,
  next,
  current,
}: {
  locale: Locale;
  next: string;
  current: 'login' | 'signup';
}) {
  const t = useTranslations('Auth.switch');
  const items = [
    { key: 'login', pathname: '/login' },
    { key: 'signup', pathname: '/signup' },
  ] as const;

  return (
    <nav aria-label={t('label')}>
      <ul className="flex gap-1 rounded-full border border-white/25 p-1">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key} className="flex flex-1">
              <Link
                href={{ pathname: item.pathname, query: withNext(locale, next) }}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  SEGMENT,
                  active ? 'bg-white text-stage' : 'text-white/85 hover:bg-white/10',
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

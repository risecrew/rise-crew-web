'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LocaleSwitch({ tone = 'light' }: { tone?: 'light' | 'ink' }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Nav');
  const target = locale === 'ko' ? 'en' : 'ko';

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      className={cn(
        'text-xs font-semibold tracking-[0.2em] uppercase underline-offset-4 hover:underline',
        tone === 'light' ? 'text-white' : 'text-cobalt',
      )}
    >
      {t('switchTo')}
    </Link>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { GlobeIcon } from '@/components/icons';
import { Link, usePathname } from '@/i18n/navigation';

// The same page in the other language. In the header it is the globe and the other language's
// code; in the phone menu it names both languages.
export function LocaleSwitch({ variant = 'bar' }: { variant?: 'bar' | 'sheet' | 'footer' }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Nav');
  const target = locale === 'ko' ? 'en' : 'ko';

  if (variant === 'sheet') {
    // 한국어 · English, always in that order; the current one is plain bold text.
    const language = (code: 'ko' | 'en', name: string) =>
      code === locale ? (
        <span lang={code} className="font-semibold text-white">
          {name}
        </span>
      ) : (
        <Link
          href={pathname}
          locale={code}
          hrefLang={code}
          lang={code}
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          {name}
        </Link>
      );
    return (
      <p className="flex items-center gap-3 text-base text-white/80">
        <GlobeIcon className="text-lg" />
        {language('ko', '한국어')}
        <span aria-hidden>·</span>
        {language('en', 'English')}
      </p>
    );
  }

  if (variant === 'footer') {
    return (
      <Link
        href={pathname}
        locale={target}
        hrefLang={target}
        lang={target}
        className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
      >
        {target === 'en' ? 'English' : '한국어'}
      </Link>
    );
  }

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      aria-label={t('switchLabel')}
      className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-white/80 transition-colors duration-150 hover:text-white"
    >
      <GlobeIcon className="text-base" />
      <span aria-hidden>{target.toUpperCase()}</span>
    </Link>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { routing } from '@/i18n/routing';
import { getSiteUrl } from '@/lib/site';
import '../globals.css';

export const metadata: Metadata = { metadataBase: getSiteUrl() };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

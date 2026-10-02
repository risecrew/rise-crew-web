import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { routing } from '@/i18n/routing';
import { FONT_STYLESHEETS } from '@/lib/fonts';
import { getSiteUrl } from '@/lib/site';
import '../globals.css';

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = { metadataBase: getSiteUrl() };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <html lang={locale} className={mono.variable}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {FONT_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} precedence="default" />
        ))}
      </head>
      <body className="bg-paper text-ink font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

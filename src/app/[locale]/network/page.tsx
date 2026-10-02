import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { asLocale } from '@/i18n/as-locale';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.network' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/network'),
  };
}

export default async function NetworkPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Network');
  return (
    <main id="main">
      <PageCover title={t('title', { count: 33 })} lead={t('lead')} />
    </main>
  );
}

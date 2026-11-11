import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DeletedNotice } from '@/components/home/deleted-notice';
import { Home } from '@/components/home/home';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { getPartners, getPhotos, getRecruitment, getStamps, getStats } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.home' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, ''),
  };
}

export default async function HomePage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  const [stats, stamps, photos, partners, recruitment] = await Promise.all([
    getStats(),
    getStamps(),
    getPhotos(),
    getPartners(),
    getRecruitment(),
  ]);

  // After an account is deleted the visitor lands here with `?deleted=1`. The page stays static:
  // the line is added in the browser, by a component that reads the address there.
  const deletedNotice = isAuthEnabled() ? (await getTranslations('Auth.me'))('deleted') : null;

  return (
    <main id="main" className="bg-stage">
      {deletedNotice ? <DeletedNotice text={deletedNotice} /> : null}
      <Home
        locale={locale}
        stats={stats}
        stamps={stamps}
        photos={photos}
        partners={partners}
        recruitment={recruitment}
        // The page is rebuilt once a day (revalidate), so "upcoming" is as of that day.
        today={new Date()}
      />
    </main>
  );
}

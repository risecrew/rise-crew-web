import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ActivityCard } from '@/components/board/activity-card';
import { PageCover } from '@/components/site/page-cover';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { getActivities } from '@/lib/board/queries';
import { getPhoto } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

// Always the current rows: what an operator saves shows at once, and a page cached mid-save could
// otherwise hide it for as long as the cache lasts.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Board.activities' });
  return {
    title: t('metaTitle'),
    description: t('lead'),
    alternates: localizedAlternates(locale, '/activities'),
  };
}

export default async function ActivitiesPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Board.activities');
  const common = await getTranslations('Common');
  const [activities, photo] = await Promise.all([getActivities(), getPhoto('roundtable-2026-08')]);
  const today = new Date();

  return (
    <main id="main" className="bg-stage">
      <PageCover
        title={t('title')}
        lead={t('lead')}
        photo={photo ? { photo, locale, temporaryLabel: common('temporaryPhoto') } : undefined}
      />
      <section className="border-t border-white/10 bg-stage text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
          {activities.length > 0 ? (
            <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <ActivityCard activity={activity} locale={locale} today={today} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg break-keep text-white/75">{t('empty')}</p>
          )}
        </div>
      </section>
    </main>
  );
}

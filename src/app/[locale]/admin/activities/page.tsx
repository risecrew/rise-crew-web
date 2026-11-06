import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PRIMARY, TEXT_BUTTON, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { getActivities } from '@/lib/board/queries';
import { formatStampDate } from '@/lib/format';
import { AccountLayout, accountMetadata } from '../../account-layout';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.activities' });
  return accountMetadata(t('title'));
}

export default async function AdminActivitiesPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/activities`);

  const t = await getTranslations('Admin.activities');
  const common = await getTranslations('Common');
  const activities = await getActivities();

  return (
    <AccountLayout>
      <div className="w-full max-w-[75rem] flex-1">
        <h1 className={TITLE}>{t('title')}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/admin/activities/new" className={PRIMARY}>
            {t('new')}
          </Link>
          <Link href="/activities" className={TEXT_BUTTON}>
            {t('toPage')}
          </Link>
        </div>
        {activities.length > 0 ? (
          <ul className="mt-10 border-b border-white/15">
            {activities.map((activity) => (
              <li key={activity.id} className="border-t border-white/15">
                <Link
                  href={`/admin/activities/${activity.id}`}
                  className="grid min-h-14 gap-x-6 gap-y-1 py-4 hover:bg-white/5 sm:grid-cols-[9rem_8rem_1fr]"
                >
                  <span className="font-mono text-sm text-white/60">
                    {activity.date ? formatStampDate(activity.date, locale) : common('dateTbc')}
                  </span>
                  <span className="font-semibold break-keep">{activity.city_ko}</span>
                  <span className="break-keep">{activity.title_ko}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-lg break-keep text-white/75">{t('empty')}</p>
        )}
      </div>
    </AccountLayout>
  );
}

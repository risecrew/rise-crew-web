import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ActivityForm } from '@/components/board/activity-form';
import { DeleteItem } from '@/components/board/delete-item';
import { ROW, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { getActivity } from '@/lib/board/queries';
import { AccountLayout, accountMetadata } from '../../../account-layout';
import { deleteActivity } from '../actions';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.activities' });
  return accountMetadata(t('edit'));
}

export default async function EditActivityPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/activities/${id}`);

  const activity = await getActivity(id);
  if (!activity) notFound();
  const t = await getTranslations('Admin.activities');

  return (
    <AccountLayout>
      <div className="w-full max-w-3xl flex-1">
        <h1 className={TITLE}>{t('edit')}</h1>
        <ActivityForm activity={activity} />
        <div className={`${ROW} mt-10`}>
          <DeleteItem id={activity.id} question={t('deleteQuestion')} action={deleteActivity} />
        </div>
      </div>
    </AccountLayout>
  );
}

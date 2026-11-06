import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NoticeForm } from '@/components/board/notice-form';
import { TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { AccountLayout, accountMetadata } from '../../../account-layout';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.notices' });
  return accountMetadata(t('new'));
}

export default async function NewNoticePage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/notices/new`);
  const t = await getTranslations('Admin.notices');

  return (
    <AccountLayout>
      <div className="w-full max-w-3xl flex-1">
        <h1 className={TITLE}>{t('new')}</h1>
        <NoticeForm />
      </div>
    </AccountLayout>
  );
}

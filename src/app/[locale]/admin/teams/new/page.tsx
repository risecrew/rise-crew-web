import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TeamSettingsForm } from '@/components/teams/admin-forms';
import { TEXT_BUTTON, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { AccountLayout, accountMetadata } from '../../../account-layout';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.teams' });
  return accountMetadata(t('new'));
}

export default async function NewTeamPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/teams/new`);

  const t = await getTranslations('Admin.teams');
  return (
    <AccountLayout>
      <div className="w-full max-w-lg">
        <h1 className={TITLE}>{t('new')}</h1>
        <p className="mt-4 text-lg break-keep text-white/85">{t('newLead')}</p>
        <TeamSettingsForm />
        <Link href="/admin/teams" className={`${TEXT_BUTTON} mt-4`}>
          {t('toList')}
        </Link>
      </div>
    </AccountLayout>
  );
}

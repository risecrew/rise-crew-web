import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveLogin } from '@/lib/auth/login';
import { getViewer } from '@/lib/auth/viewer';
import { single } from '@/lib/search-params';
import { AccountLayout, accountMetadata } from '../account-layout';
import { ForgotForm } from './forgot-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.forgot' });
  return accountMetadata(t('metaTitle'));
}

// Also the way to change a password from My page, so one who is signed in is not sent away.
export default async function ForgotPasswordPage({ params, searchParams }: Props) {
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const next = leaveLogin(single((await searchParams).next), locale);

  const viewer = await getViewer().catch(() => null);

  return (
    <AccountLayout>
      <ForgotForm locale={locale} next={next} email={viewer?.email ?? ''} />
    </AccountLayout>
  );
}

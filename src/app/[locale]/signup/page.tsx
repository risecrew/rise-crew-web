import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveLogin } from '@/lib/auth/login';
import { getViewer, type Viewer } from '@/lib/auth/viewer';
import { single } from '@/lib/search-params';
import { AccountLayout, accountMetadata } from '../account-layout';
import { SignupForm } from './signup-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.signup' });
  return accountMetadata(t('metaTitle'));
}

async function currentViewer(): Promise<Viewer | null> {
  try {
    return await getViewer();
  } catch {
    return null;
  }
}

export default async function SignupPage({ params, searchParams }: Props) {
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const next = leaveLogin(single((await searchParams).next), locale);

  const viewer = await currentViewer();
  if (viewer && !viewer.blocked && viewer.onboarded) redirect(next);

  return (
    <AccountLayout>
      <SignupForm locale={locale} next={next} />
    </AccountLayout>
  );
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveLogin } from '@/lib/auth/login';
import { getViewer } from '@/lib/auth/viewer';
import { single } from '@/lib/search-params';
import { AccountLayout, accountMetadata } from '../account-layout';
import { ResetForm } from './reset-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.reset' });
  return accountMetadata(t('metaTitle'));
}

// Only with a session, which the mailed code gives. Without one there is no account to change, and
// the visitor is sent back to sign in. A new account chooses its first password here (`first`
// only changes the wording), and finishes signing up afterwards.
export default async function ResetPasswordPage({ params, searchParams }: Props) {
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const next = leaveLogin(single(query.next), locale);

  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?error=link`);
  if (viewer.blocked) redirect(`/${locale}/login?error=blocked`);

  // Someone who "signed up" with an address that already has a finished account has simply signed in.
  const first = single(query.first) === '1';
  if (first && viewer.onboarded) redirect(next);

  return (
    <AccountLayout>
      <ResetForm locale={locale} next={next} first={first} />
    </AccountLayout>
  );
}

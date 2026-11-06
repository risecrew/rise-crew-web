import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveWelcome } from '@/lib/auth/login';
import { getViewer } from '@/lib/auth/viewer';
import { single } from '@/lib/search-params';
import { AccountLayout, accountMetadata } from '../account-layout';
import { ProfileForm } from './profile-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.welcome' });
  return accountMetadata(t('metaTitle'));
}

// The sign-up form: the second half of a first sign-in. The emailed link and the Google sign-in
// both end here for an account that has not finished signing up (see finishSignIn), and so does
// every page that needs a finished account.
export default async function WelcomePage({ params, searchParams }: Props) {
  // With accounts switched off there is no sign-up, exactly as before it existed.
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;

  // Where the visitor was heading before sign-in got in the way (vetted, and never this form).
  const next = leaveWelcome(single(query.next), locale);

  const viewer = await getViewer();
  // Nobody to sign up: sign in first, and the link brings them back through here.
  if (!viewer) {
    redirect(`/${locale}/login${next === `/${locale}` ? '' : `?next=${encodeURIComponent(next)}`}`);
  }
  // A blocked account is shown the reason on the login page, which also ends its session.
  if (viewer.blocked) redirect(`/${locale}/login?error=blocked`);
  // Already signed up: nothing to fill in.
  if (viewer.onboarded) redirect(next);

  const t = await getTranslations('Auth.welcome');

  return (
    <AccountLayout>
      <div className="w-full max-w-lg">
        <h1 className="font-display text-hero text-balance break-keep">{t('title')}</h1>
        <p className="mt-5 text-lg break-keep text-white/85">{t('lead')}</p>
        <ProfileForm mode="welcome" email={viewer.email} next={next} />
      </div>
    </AccountLayout>
  );
}

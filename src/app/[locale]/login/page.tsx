import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveLogin, loginNotice } from '@/lib/auth/login';
import { getViewer, type Viewer } from '@/lib/auth/viewer';
import { AccountLayout, accountMetadata } from '../account-layout';
import { LoginForm } from './login-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.login' });
  return accountMetadata(t('title'));
}

// A query value that is one string. Repeated parameters (`?next=a&next=b`) arrive as a list and
// count as absent: nobody has a reason to send two.
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// The visitor, or null when there is none or the database cannot be read: a sign-in page that
// fails to open is worse than one that shows the form to somebody who was already signed in.
async function currentViewer(): Promise<Viewer | null> {
  try {
    return await getViewer();
  } catch {
    return null;
  }
}

export default async function LoginPage({ params, searchParams }: Props) {
  // With accounts switched off there is no login page, exactly as before it existed.
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;

  const next = leaveLogin(single(query.next), locale);
  const viewer = await currentViewer();
  const blocked = viewer?.blocked === true;

  // Someone who is already signed in and finished signing up has nothing to do here. A page sent
  // with an `error` is the exception: a sign-in that failed after the link was checked can leave
  // a session behind, and the visitor still needs the message and the form.
  if (viewer && !blocked && viewer.onboarded && query.error === undefined) redirect(next);

  // A blocked account counts as signed out: it gets the reason, whatever the address said.
  const notice = blocked ? 'blocked' : loginNotice(single(query.error));

  return (
    <AccountLayout>
      <LoginForm locale={locale} next={next} notice={notice} endSession={blocked} />
    </AccountLayout>
  );
}

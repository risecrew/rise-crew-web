import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TITLE } from '@/components/teams/form-parts';
import { PostForm } from '@/components/teams/post-form';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireViewer } from '@/lib/auth/viewer';
import { getTeamAccess, getTeamBySlug } from '@/lib/teams/queries';
import { AccountLayout, accountMetadata } from '../../../../account-layout';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Teams.form' });
  return accountMetadata(t('newPost'));
}

// Only the team writes on its page. An operator who wants to write joins the team first.
export default async function NewPostPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const viewer = await requireViewer(locale, `/${locale}/startups/${slug}/posts/new`);
  const team = await getTeamBySlug(slug);
  if (!team) notFound();
  const access = await getTeamAccess(team, viewer);
  if (!access.isMember) notFound();

  const t = await getTranslations('Teams.form');
  return (
    <AccountLayout>
      <div className="w-full max-w-2xl">
        <h1 className={TITLE}>{t('newPost')}</h1>
        <p className="mt-4 text-lg break-keep text-white/85">{team.name}</p>
        <PostForm team={team} />
      </div>
    </AccountLayout>
  );
}

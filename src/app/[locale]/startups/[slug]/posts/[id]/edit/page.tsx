import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TITLE } from '@/components/teams/form-parts';
import { PostForm } from '@/components/teams/post-form';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireViewer } from '@/lib/auth/viewer';
import { getPost, getTeamAccess, getTeamBySlug, signPhotoPairs } from '@/lib/teams/queries';
import { isUuid } from '@/lib/teams/query';
import { AccountLayout, accountMetadata } from '../../../../../account-layout';

type Props = { params: Promise<{ locale: string; slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Teams.form' });
  return accountMetadata(t('editPost'));
}

export default async function EditPostPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, slug, id } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const viewer = await requireViewer(locale, `/${locale}/startups/${slug}/posts/${id}/edit`);
  if (!isUuid(id)) notFound();
  const team = await getTeamBySlug(slug);
  if (!team) notFound();
  const access = await getTeamAccess(team, viewer);
  if (!access.isMember) notFound();
  const post = await getPost(team.id, id);
  if (!post) notFound();

  const t = await getTranslations('Teams.form');
  return (
    <AccountLayout>
      <div className="w-full max-w-2xl">
        <h1 className={TITLE}>{t('editPost')}</h1>
        <p className="mt-4 text-lg break-keep text-white/85">{team.name}</p>
        <PostForm
          team={team}
          post={{
            id: post.id,
            title: post.title,
            body: post.body,
            visibility: post.visibility,
            photos: await signPhotoPairs(post.photo_paths),
          }}
        />
      </div>
    </AccountLayout>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HidePostButton } from '@/components/teams/admin-forms';
import { DeletePost } from '@/components/teams/delete-post';
import { OUTLINE } from '@/components/teams/form-parts';
import { PostBody } from '@/components/teams/post-body';
import { PostChips } from '@/components/teams/post-list';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getViewer } from '@/lib/auth/viewer';
import { localizedAlternates } from '@/lib/metadata';
import {
  getPost,
  getTeamAccess,
  getTeamBySlug,
  signPhotos,
  teamShareImage,
} from '@/lib/teams/queries';
import { isUuid } from '@/lib/teams/query';
import { postDate } from '@/lib/teams/text';

type Props = { params: Promise<{ locale: string; slug: string; id: string }> };

async function readPost(slug: string, id: string) {
  if (!isUuid(id)) return null;
  const team = await getTeamBySlug(slug);
  if (!team) return null;
  const post = await getPost(team.id, id);
  return post ? { team, post } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const { locale: raw, slug, id } = await params;
  const locale = asLocale(raw);
  const found = await readPost(slug, id);
  if (!found) return {};
  const { team, post } = found;
  const path = `/startups/${team.slug}/posts/${post.id}` as const;
  const image = teamShareImage(team);
  return {
    title: `${post.title} | ${team.name}`,
    alternates: localizedAlternates(locale, path),
    // A card only for a post anyone may read: a signed-in post's link tells nothing when shared.
    ...(post.visibility === 'public' && !post.hidden_at
      ? {
          description: post.body.slice(0, 120) || undefined,
          openGraph: {
            type: 'article',
            title: `${post.title} | ${team.name}`,
            description: post.body.slice(0, 120) || undefined,
            url: `/${locale}${path}`,
            ...(image ? { images: [image] } : {}),
          },
          twitter: { card: 'summary_large_image' },
        }
      : {}),
  };
}

// One post. Whether the visitor may read it is the database's answer: a signed-in post, a hidden
// post, or a post of an unpublished team looks like any other address that is not a page.
export default async function PostPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, slug, id } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const found = await readPost(slug, id);
  if (!found) notFound();
  const { team, post } = found;

  const t = await getTranslations('Teams');
  const [photos, access] = await Promise.all([
    signPhotos(post.photo_paths),
    getTeamAccess(team, await getViewer()),
  ]);

  return (
    <main
      id="main"
      className="relative isolate min-h-svh overflow-clip bg-stage px-5 pt-32 pb-20 text-white md:px-10"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[80svh] bg-[radial-gradient(ellipse_75%_65%_at_50%_0%,rgb(0_62_145/0.6),transparent_70%)]"
      />
      <article className="mx-auto max-w-3xl">
        <Link
          href={`/startups/${team.slug}`}
          className="inline-flex min-h-11 items-center break-keep text-white underline underline-offset-4"
        >
          {t('posts.backToTeam', { team: team.name })}
        </Link>
        <h1 className="mt-4 font-display text-headline text-balance wrap-anywhere break-keep">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
          <time dateTime={post.created_at} className="font-mono">
            {postDate(post.created_at, locale)}
          </time>
          {post.edited_at ? (
            <span>{t('posts.edited', { date: postDate(post.edited_at, locale) })}</span>
          ) : null}
          <PostChips post={post} />
        </div>
        {post.body ? (
          <div className="mt-8 border-t border-white/15 pt-8">
            <PostBody text={post.body} />
          </div>
        ) : null}
        {photos.length > 0 ? (
          <div className="mt-10 flex flex-col gap-4">
            {photos.map((url, index) => (
              <Image
                key={url}
                src={url}
                alt={t('posts.photoAlt', { title: post.title, number: index + 1 })}
                width={1200}
                height={900}
                unoptimized
                className="h-auto w-full rounded-lg"
              />
            ))}
          </div>
        ) : null}
        {access.isMember || access.isStaff ? (
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5">
            {access.isMember ? (
              <Link href={`/startups/${team.slug}/posts/${post.id}/edit`} className={OUTLINE}>
                {t('form.edit')}
              </Link>
            ) : null}
            {access.isStaff ? (
              <HidePostButton postId={post.id} hidden={post.hidden_at !== null} />
            ) : null}
            <DeletePost slug={team.slug} id={post.id} />
          </div>
        ) : null}
      </article>
    </main>
  );
}

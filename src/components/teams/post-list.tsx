import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import type { ListedPost, Post } from '@/lib/teams/queries';
import { postDate } from '@/lib/teams/text';

export const CHIP =
  'rounded-full border border-white/25 px-3 py-1 text-sm font-semibold text-white';

export function PostChips({ post }: { post: Pick<Post, 'visibility' | 'hidden_at'> }) {
  const t = useTranslations('Teams');
  if (post.visibility === 'public' && !post.hidden_at) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {post.visibility === 'signed_in' ? (
        <span className={CHIP}>{t('visibility.signed_in')}</span>
      ) : null}
      {post.hidden_at ? <span className={CHIP}>{t('hidden')}</span> : null}
    </span>
  );
}

// The posts on a team's page, newest first: a date, a title and the start of the words, under ruled
// lines. The author is the team, so no name appears.
export function PostList({ posts, slug }: { posts: ListedPost[]; slug: string }) {
  const locale = useLocale() as Locale;
  return (
    <ul className="mt-10">
      {posts.map((post) => (
        <li key={post.id} className="border-t border-white/15">
          <Link
            href={`/startups/${slug}/posts/${post.id}`}
            className="group flex items-start justify-between gap-4 py-5 transition-colors duration-150 hover:bg-white/5 md:gap-8"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-3">
                <time dateTime={post.created_at} className="text-sm text-white/60 tabular-nums">
                  {postDate(post.created_at, locale)}
                </time>
                <PostChips post={post} />
              </span>
              <span className="mt-2 block font-display text-2xl font-[850] wrap-anywhere break-keep underline-offset-4 group-hover:underline">
                {post.title}
              </span>
              {post.body ? (
                <span className="mt-2 line-clamp-2 max-w-3xl wrap-anywhere break-keep text-white/75">
                  {post.body}
                </span>
              ) : null}
            </span>
            {post.thumbnail ? (
              <Image
                src={post.thumbnail}
                alt=""
                width={320}
                height={240}
                unoptimized
                loading="lazy"
                className="aspect-[4/3] w-24 shrink-0 rounded-lg object-cover sm:w-40"
              />
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

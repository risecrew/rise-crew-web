import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionHeading } from '@/components/site/section-heading';
import { Fact, FactList } from '@/components/stage/facts';
import { OUTLINE, PRIMARY } from '@/components/teams/form-parts';
import { Pager } from '@/components/teams/pager';
import { CHIP, PostList } from '@/components/teams/post-list';
import { TeamCover } from '@/components/teams/team-cover';
import { TeamMark } from '@/components/teams/team-mark';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getViewer } from '@/lib/auth/viewer';
import { localizedAlternates } from '@/lib/metadata';
import {
  getTeamAccess,
  getTeamBySlug,
  getTeamCover,
  listPosts,
  logoUrl,
  pageCount,
} from '@/lib/teams/queries';
import { parseTeamsQuery } from '@/lib/teams/query';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  const team = await getTeamBySlug(slug);
  if (!team) return {};
  return {
    title: team.name,
    description: team.tagline || undefined,
    alternates: localizedAlternates(locale, `/startups/${team.slug}`),
  };
}

// A team's page: who they are, in their own words, then what they have posted. Which team shows and
// which posts come back is the database's answer for this visitor: a team or post they may not see
// looks like any other address that is not a page.
export default async function TeamPage({ params, searchParams }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);

  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const t = await getTranslations('Teams');
  const { page } = parseTeamsQuery(await searchParams);
  const viewer = await getViewer();
  const canReadSignedIn = viewer !== null && viewer.onboarded && !viewer.blocked;
  const [access, cover, { posts, total, lockedCount }] = await Promise.all([
    getTeamAccess(team, viewer),
    getTeamCover(team.id),
    listPosts(team.id, page, !canReadSignedIn && !viewer?.blocked),
  ]);
  const signedIn = viewer !== null;
  const path = `/${locale}/startups/${team.slug}`;

  return (
    <main id="main" className="bg-stage">
      <TeamCover
        name={team.name}
        tagline={team.tagline}
        facts={`${t(`fields.${team.field}`)} · ${t('cohort', { cohort: team.cohort })}`}
        photo={cover}
        logo={
          team.logo_path ? (
            <TeamMark
              name={team.name}
              url={logoUrl(team.logo_path)}
              className="size-20 bg-stage md:size-32"
            />
          ) : null
        }
        badge={!team.is_published ? <span className={CHIP}>{t('unpublished')}</span> : null}
        actions={
          access.isMember || access.isStaff ? (
            <>
              {access.isMember ? (
                <Link href={`/startups/${team.slug}/posts/new`} className={PRIMARY}>
                  {t('form.newPost')}
                </Link>
              ) : null}
              <Link href={`/startups/${team.slug}/edit`} className={OUTLINE}>
                {t('form.editIntro')}
              </Link>
            </>
          ) : null
        }
      />

      <section className="border-t border-white/10 bg-stage text-white">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[2fr_1fr]">
          <p className="max-w-3xl text-lg leading-relaxed wrap-anywhere break-keep whitespace-pre-wrap text-white/85">
            {team.intro || t('introEmpty')}
          </p>
          {team.links.length > 0 ? (
            <FactList>
              <Fact label={t('facts.links')}>
                <ul className="flex flex-col">
                  {team.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="inline-flex min-h-11 items-center underline underline-offset-4"
                      >
                        {t(`linkKinds.${link.kind}`)}
                      </a>
                    </li>
                  ))}
                </ul>
              </Fact>
            </FactList>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="posts-title"
        className="border-t border-white/10 bg-stage text-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
          <SectionHeading id="posts-title" title={t('posts.title')} />

          {lockedCount > 0 ? (
            <div className="mt-8 flex max-w-2xl flex-wrap items-center justify-between gap-x-4 rounded-lg border border-white/25 px-4 py-3">
              <p className="break-keep">
                {t(signedIn ? 'lockedFinish' : 'locked', { count: lockedCount })}
              </p>
              <Link
                href={
                  signedIn
                    ? `/welcome?next=${encodeURIComponent(path)}`
                    : `/login?next=${encodeURIComponent(path)}`
                }
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                {t(signedIn ? 'finish' : 'signIn')}
              </Link>
            </div>
          ) : null}

          {posts.length > 0 ? (
            <PostList posts={posts} slug={team.slug} />
          ) : (
            <p className="mt-8 border-t border-white/15 pt-6 text-lg text-white/85">
              {t('posts.empty')}
            </p>
          )}

          <Pager pathname={`/startups/${team.slug}`} page={page} pages={pageCount(total)} />
        </div>
      </section>
    </main>
  );
}

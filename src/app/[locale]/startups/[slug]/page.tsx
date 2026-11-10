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
  teamShareImage,
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
  const description = team.tagline || team.intro.slice(0, 120) || undefined;
  const image = teamShareImage(team);
  const t = await getTranslations({ locale, namespace: 'Teams' });
  return {
    title: t('metaTeamTitle', { name: team.name }),
    description,
    alternates: localizedAlternates(locale, `/startups/${team.slug}`),
    openGraph: {
      type: 'website',
      title: `${team.name} | RISE CREW`,
      description,
      url: `/${locale}/startups/${team.slug}`,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: 'summary_large_image' },
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
  const canReadSignedIn =
    viewer !== null && viewer.onboarded && !viewer.blocked && viewer.role !== 'applicant';
  const [access, cover, { posts, total, lockedCount }] = await Promise.all([
    getTeamAccess(team, viewer),
    getTeamCover(team),
    listPosts(team.id, page, !canReadSignedIn && !viewer?.blocked),
  ]);
  const signedIn = viewer !== null;
  const applying = viewer?.onboarded === true && viewer.role === 'applicant';
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
                  {team.links.map((link, index) => (
                    <li key={`${link.url}-${index}`}>
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
                {t(applying ? 'lockedApplying' : signedIn ? 'lockedFinish' : 'locked', {
                  count: lockedCount,
                })}
              </p>
              {applying ? null : (
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
              )}
            </div>
          ) : null}

          {posts.length > 0 ? (
            <PostList posts={posts} slug={team.slug} />
          ) : (
            <div className="mt-8 border-t border-white/15 pt-6">
              <p className="text-lg text-white/85">
                {t(page > 1 ? 'posts.emptyPage' : 'posts.empty')}
              </p>
              {page > 1 ? (
                <Link
                  href={`/startups/${team.slug}`}
                  className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {t('pager.first')}
                </Link>
              ) : null}
            </div>
          )}

          {posts.length > 0 ? (
            <Pager pathname={`/startups/${team.slug}`} page={page} pages={pageCount(total)} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { PRIMARY, TEXT_BUTTON } from '@/components/teams/form-parts';
import { Pager } from '@/components/teams/pager';
import { TeamCard } from '@/components/teams/team-card';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { atLeast } from '@/lib/auth/roles';
import { getViewer } from '@/lib/auth/viewer';
import { localizedAlternates } from '@/lib/metadata';
import { TEAM_FIELDS } from '@/lib/teams/fields';
import { listTeams, logoUrl, pageCount } from '@/lib/teams/queries';
import { parseTeamsQuery, type TeamsQuery } from '@/lib/teams/query';
import { cn } from '@/lib/utils';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const FILTER =
  'inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-base font-semibold text-white transition-[background-color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.97]';
const FILTER_ON = 'border-white bg-white text-stage hover:bg-white';

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Teams' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates(locale, '/startups'),
  };
}

// The address of the list with some filters changed. Changing a filter goes back to the first page.
function filterQuery(q: TeamsQuery, change: Partial<TeamsQuery>) {
  const next = { ...q, ...change };
  return {
    ...(next.field ? { field: next.field } : {}),
    ...(next.cohort ? { cohort: next.cohort } : {}),
  };
}

// Everyone's list of the published teams. The filters are plain links, so a filtered list can be
// shared and works without scripts.
export default async function StartupsPage({ params, searchParams }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Teams');
  const adminT = await getTranslations('Admin.teams');

  const viewer = await getViewer();
  const isStaff = viewer !== null && !viewer.blocked && atLeast(viewer.role, 'operator');

  const q = parseTeamsQuery(await searchParams);
  const { teams, cohorts, total } = await listTeams(q);
  const filtered = q.field !== null || q.cohort !== null;

  return (
    <main id="main" className="bg-stage">
      <PageCover title={t('title')} lead={t('lead')}>
        {isStaff ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/admin/teams/new" className={PRIMARY}>
              {adminT('new')}
            </Link>
            <Link href="/admin/teams" className={TEXT_BUTTON}>
              {adminT('title')}
            </Link>
          </div>
        ) : null}
      </PageCover>

      <section className="border-t border-white/10 bg-stage text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
          <nav aria-label={t('filters.label')} className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-medium text-white/60">{t('filters.field')}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                <li>
                  <Link
                    href={{ pathname: '/startups', query: filterQuery(q, { field: null }) }}
                    aria-current={q.field === null ? 'true' : undefined}
                    className={cn(FILTER, q.field === null && FILTER_ON)}
                  >
                    {t('filters.all')}
                  </Link>
                </li>
                {TEAM_FIELDS.map((field) => (
                  <li key={field}>
                    <Link
                      href={{ pathname: '/startups', query: filterQuery(q, { field }) }}
                      aria-current={q.field === field ? 'true' : undefined}
                      className={cn(FILTER, q.field === field && FILTER_ON)}
                    >
                      {t(`fields.${field}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {cohorts.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-white/60">{t('filters.cohort')}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  <li>
                    <Link
                      href={{ pathname: '/startups', query: filterQuery(q, { cohort: null }) }}
                      aria-current={q.cohort === null ? 'true' : undefined}
                      className={cn(FILTER, q.cohort === null && FILTER_ON)}
                    >
                      {t('filters.all')}
                    </Link>
                  </li>
                  {cohorts.map((cohort) => (
                    <li key={cohort}>
                      <Link
                        href={{ pathname: '/startups', query: filterQuery(q, { cohort }) }}
                        aria-current={q.cohort === cohort ? 'true' : undefined}
                        className={cn(FILTER, q.cohort === cohort && FILTER_ON)}
                      >
                        {t('cohort', { cohort })}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </nav>

          {teams.length > 0 ? (
            <>
              <p className="mt-10 text-sm font-medium text-white/60">
                {t('total', { count: total })}
              </p>
              <ul className="mt-3 grid gap-x-10 md:grid-cols-2">
                {teams.map((team) => (
                  <TeamCard key={team.id} team={team} logo={logoUrl(team.logo_path)} />
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-10 border-t border-white/15 pt-6">
              <p className="text-lg text-white/85">{t(filtered ? 'emptyFiltered' : 'empty')}</p>
              {filtered ? (
                <Link
                  href="/startups"
                  className="mt-2 inline-flex min-h-11 items-center text-white underline underline-offset-4"
                >
                  {t('filters.clear')}
                </Link>
              ) : null}
            </div>
          )}

          <Pager
            pathname="/startups"
            query={filterQuery(q, {})}
            page={q.page}
            pages={pageCount(total)}
          />
        </div>
      </section>
    </main>
  );
}

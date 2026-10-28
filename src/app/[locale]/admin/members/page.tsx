import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import {
  canManage,
  hasFilters,
  membersParams,
  pageCount,
  pageRange,
  parseMembersQuery,
  searchPattern,
  type MembersQuery,
} from '@/lib/auth/members';
import { displayName } from '@/lib/auth/name';
import { isStudent } from '@/lib/auth/occupation';
import { ROLE_ORDER } from '@/lib/auth/roles';
import { requireRole } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccountLayout, accountMetadata } from '../../account-layout';
import { MembersTable, type MemberRowView } from './members-table';
import { Tick } from './tick';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.members' });
  return accountMetadata(t('metaTitle'));
}

const TITLE =
  'font-display text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance break-keep';
const PILL =
  'inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 px-6 py-3 text-base font-semibold break-keep text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/10 active:scale-[0.97] motion-reduce:transition-none';
const FIELD =
  'w-full rounded-full border border-white/50 bg-white/5 px-5 py-3 text-base text-white placeholder:text-white/55';
const LINK =
  'inline-flex min-h-11 items-center px-3 text-base text-white underline underline-offset-4';

const COLUMNS =
  'id, email, last_name, first_name, occupation, school, major, affiliation, recruit_opt_in, onboarded_at, role, blocked_at' as const;

// The members screen (operators and admins): who has signed up, with what they told us, and the
// buttons that change their roles or block them. It is a page, not a modal, and it reads its
// state from the address (`?q=...&role=...&optin=1&page=2`) so a search is a link and works
// without scripts.
//
// The list is read with the visitor's own session: the database shows every account to an
// operator or admin and only their own to anyone else. Changes go through the server actions next
// to this file, which check everything again.
export default async function MembersPage({ params, searchParams }: Props) {
  // With accounts switched off there is no members screen, exactly as before it existed.
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = parseMembersQuery(await searchParams);

  // Signed out goes to sign-in (and comes back here), an unfinished sign-up to the form, and
  // everyone below operator, or blocked, gets a 404: a page they may not see does not admit that
  // it exists.
  const viewer = await requireRole(locale, 'operator', `/${locale}/admin/members`);
  const t = await getTranslations('Admin.members');
  const roles = await getTranslations('Auth.me.roles');
  const occupations = await getTranslations('Auth.profile.occupation');

  const supabase = await createSupabaseServerClient();
  const read = (from: number, to: number) => {
    let request = supabase.from('member_list').select(COLUMNS, { count: 'exact' });
    if (query.q) request = request.ilike('search_text', searchPattern(query.q));
    if (query.role) request = request.eq('role', query.role);
    if (query.optIn) request = request.eq('recruit_opt_in', true);
    // Newest sign-ups first, which is where the next batch of members is. The id keeps two
    // accounts made in the same instant from swapping places between pages.
    return request
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);
  };

  let page = query.page;
  let result = await read(...pageRange(page));
  // A page past the end (a link from before some people left) shows the last one instead. The
  // database refuses a range that starts beyond the last row (PGRST103), and then does not say
  // how many rows there are, so one row is asked for to learn it.
  if (result.error?.code === 'PGRST103') {
    const count = (await read(0, 0)).count ?? 0;
    page = pageCount(count);
    result = await read(...pageRange(page));
  } else if (!result.error && page > pageCount(result.count ?? 0)) {
    page = pageCount(result.count ?? 0);
    result = await read(...pageRange(page));
  }
  if (result.error) throw new Error(result.error.message);
  const total = result.count ?? 0;
  const pages = pageCount(total);

  const rows: MemberRowView[] = result.data.map((row) => {
    const student = row.occupation !== null && isStudent(row.occupation);
    const detail = student
      ? [row.school, row.major].filter((part) => part && part.trim() !== '').join(' · ')
      : (row.affiliation ?? '');
    return {
      id: row.id,
      name: displayName(row, locale),
      email: row.email,
      occupation: row.occupation ? occupations(row.occupation) : '',
      detail,
      optIn: row.recruit_opt_in,
      roleLabel: roles(row.role),
      blocked: row.blocked_at !== null,
      selectable: canManage(viewer.role, row.role, row.id === viewer.id),
    };
  });

  return (
    <AccountLayout>
      <div className="w-full max-w-6xl flex-1">
        <h1 className={TITLE}>{t('title')}</h1>

        <form
          method="get"
          action={`/${locale}/admin/members`}
          role="search"
          className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4"
        >
          <div className="lg:flex-1">
            <label htmlFor="members-q" className="sr-only">
              {t('search.label')}
            </label>
            <input
              id="members-q"
              type="search"
              name="q"
              defaultValue={query.q}
              maxLength={100}
              placeholder={t('search.placeholder')}
              autoComplete="off"
              enterKeyHint="search"
              className={FIELD}
            />
          </div>
          <div className="relative lg:w-56">
            <label htmlFor="members-role" className="sr-only">
              {t('filters.role')}
            </label>
            <select
              id="members-role"
              name="role"
              defaultValue={query.role ?? ''}
              className={`${FIELD} appearance-none pr-12 [color-scheme:dark]`}
            >
              <option value="">{t('filters.allRoles')}</option>
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {roles(role)}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-white/75"
            >
              <path
                d="M3.5 6l4.5 4.5L12.5 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base break-keep text-white/85">
            <Tick name="optin" value="1" defaultChecked={query.optIn} />
            <span>{t('filters.optIn')}</span>
          </label>
          <button type="submit" className={PILL}>
            {t('search.submit')}
          </button>
        </form>

        {rows.length === 0 ? (
          <div className="mt-8 border-t border-white/15 pt-6">
            <p className="text-lg text-pretty break-keep text-white">{t('empty')}</p>
            {hasFilters(query) ? (
              <p className="mt-2">
                <Link href="/admin/members" prefetch={false} className={`${LINK} -ml-3`}>
                  {t('filters.clear')}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-8 text-base text-white/75">{t('count', { count: total })}</p>
            <MembersTable rows={rows} admin={viewer.role === 'admin'} />
            {pages > 1 ? (
              <nav
                aria-label={t('pages.label')}
                className="mt-8 flex items-center justify-between gap-4 border-t border-white/15 pt-4"
              >
                <PageLink query={query} page={page - 1} show={page > 1}>
                  {t('pages.previous')}
                </PageLink>
                <p className="text-base text-white/75">
                  {t('pages.position', { page, total: pages })}
                </p>
                <PageLink query={query} page={page + 1} show={page < pages}>
                  {t('pages.next')}
                </PageLink>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </AccountLayout>
  );
}

// A link to another page of the same list, or nothing where there is no such page.
function PageLink({
  query,
  page,
  show,
  children,
}: {
  query: MembersQuery;
  page: number;
  show: boolean;
  children: string;
}) {
  if (!show) return <span className="min-w-16" />;
  return (
    <Link
      href={{ pathname: '/admin/members', query: membersParams(query, page) }}
      prefetch={false}
      className={LINK}
    >
      {children}
    </Link>
  );
}

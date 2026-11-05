import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CHIP } from '@/components/teams/post-list';
import { PRIMARY, TEXT_BUTTON } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamField } from '@/lib/teams/fields';
import { AccountLayout, accountMetadata } from '../../account-layout';

type Props = { params: Promise<{ locale: string }> };

const TITLE =
  'font-display text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance break-keep';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.teams' });
  return accountMetadata(t('title'));
}

// Every team, published or not, for operators: where a team is made, and where its people and
// hidden posts are looked after. A short list, so it has no paging yet.
export default async function AdminTeamsPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/teams`);

  const t = await getTranslations('Admin.teams');
  const teamT = await getTranslations('Teams');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('teams')
    .select('id, slug, name, field, cohort, is_published')
    .order('cohort', { ascending: false })
    .order('name');
  if (error) throw new Error(error.message);

  return (
    <AccountLayout>
      <div className="w-full max-w-[75rem] flex-1">
        <h1 className={TITLE}>{t('title')}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/admin/teams/new" className={PRIMARY}>
            {t('new')}
          </Link>
          <Link href="/admin/members" className={TEXT_BUTTON}>
            {t('toMembers')}
          </Link>
        </div>
        {data.length > 0 ? (
          <ul className="mt-10 grid gap-x-10 md:grid-cols-2">
            {data.map((team) => (
              <li key={team.id} className="border-t border-white/15">
                <Link
                  href={`/admin/teams/${team.id}`}
                  className="group flex items-start justify-between gap-3 py-4 transition-colors duration-150 hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-2xl font-[850] wrap-anywhere break-keep group-hover:underline">
                      {team.name}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-white/60">
                      {teamT(`fields.${team.field as TeamField}`)} ·{' '}
                      {teamT('cohort', { cohort: team.cohort })} · /{team.slug}
                    </span>
                  </span>
                  {!team.is_published ? (
                    <span className={`${CHIP} shrink-0`}>{teamT('unpublished')}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 border-t border-white/15 pt-6 text-lg text-white/85">{t('empty')}</p>
        )}
      </div>
    </AccountLayout>
  );
}

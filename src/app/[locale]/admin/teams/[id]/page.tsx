import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  AddMemberForm,
  HidePostButton,
  RemoveMemberButton,
  TeamSettingsForm,
} from '@/components/teams/admin-forms';
import { DeleteItem } from '@/components/board/delete-item';
import { TEXT_BUTTON, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { displayName } from '@/lib/auth/profile';
import { requireRole } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/teams/query';
import { AccountLayout, accountMetadata } from '../../../account-layout';
import { deleteTeam } from '../actions';

type Props = { params: Promise<{ locale: string; id: string }> };

const SECTION_TITLE = 'font-display text-2xl font-[850] break-keep';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.teams' });
  return accountMetadata(t('title'));
}

// One team, for operators: its settings, its people, and its hidden posts. Operators can read the
// member list, so this is the one place a team's people are named.
export default async function AdminTeamPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, id } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/teams/${id}`);
  if (!isUuid(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, slug, name, cohort, is_published')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!team) notFound();

  const [memberRows, hiddenPosts, postCount] = await Promise.all([
    supabase.from('team_members').select('user_id').eq('team_id', id),
    supabase
      .from('team_posts')
      .select('id, title')
      .eq('team_id', id)
      .not('hidden_at', 'is', null)
      .order('hidden_at', { ascending: false }),
    supabase.from('team_posts').select('id', { count: 'exact', head: true }).eq('team_id', id),
  ]);
  if (memberRows.error) throw new Error(memberRows.error.message);
  if (hiddenPosts.error) throw new Error(hiddenPosts.error.message);

  const userIds = memberRows.data.map((row) => row.user_id);
  const people =
    userIds.length > 0
      ? await supabase
          .from('member_list')
          .select('id, email, last_name, first_name')
          .in('id', userIds)
          .order('email')
      : { data: [], error: null };
  if (people.error) throw new Error(people.error.message);

  const t = await getTranslations('Admin.teams');
  return (
    <AccountLayout>
      <div className="w-full max-w-2xl">
        <h1 className={TITLE}>{team.name}</h1>
        <div className="mt-4 flex flex-wrap gap-1">
          <Link href={`/startups/${team.slug}`} className={TEXT_BUTTON}>
            {t('toPage')}
          </Link>
          <Link href="/admin/teams" className={TEXT_BUTTON}>
            {t('toList')}
          </Link>
        </div>

        <TeamSettingsForm team={team} />

        <section aria-labelledby="team-people" className="mt-14">
          <h2 id="team-people" className={SECTION_TITLE}>
            {t('people')}
          </h2>
          {(people.data ?? []).length > 0 ? (
            <ul className="mt-4">
              {(people.data ?? []).map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold break-keep">
                      {displayName(
                        {
                          last_name: person.last_name,
                          first_name: person.first_name,
                        },
                        locale,
                      )}
                    </span>
                    <span className="block break-all text-white/75">{person.email}</span>
                  </span>
                  <RemoveMemberButton
                    teamId={team.id}
                    userId={person.id!}
                    label={t('removeMemberLabel', { email: person.email ?? '' })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-white/15 pt-4 text-white/85">{t('noPeople')}</p>
          )}
          <AddMemberForm teamId={team.id} />
        </section>

        <section aria-labelledby="team-hidden" className="mt-14">
          <h2 id="team-hidden" className={SECTION_TITLE}>
            {t('hiddenPosts')}
          </h2>
          {hiddenPosts.data.length > 0 ? (
            <ul className="mt-4">
              {hiddenPosts.data.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 py-3"
                >
                  <Link
                    href={`/startups/${team.slug}/posts/${post.id}`}
                    className="inline-flex min-h-11 min-w-0 items-center wrap-anywhere break-keep underline underline-offset-4"
                  >
                    {post.title}
                  </Link>
                  <HidePostButton
                    postId={post.id}
                    hidden
                    variant="text"
                    label={t('unhideLabel', { title: post.title })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-white/15 pt-4 text-white/85">{t('noHidden')}</p>
          )}
        </section>

        <section aria-labelledby="team-delete" className="mt-14 border-t border-white/15 pt-6">
          <h2 id="team-delete" className={SECTION_TITLE}>
            {t('deleteTitle')}
          </h2>
          <p className="mt-2 mb-4 text-base break-keep text-white/75">{t('deleteLead')}</p>
          <DeleteItem
            id={team.id}
            action={deleteTeam}
            question={t('deleteQuestion', {
              name: team.name,
              posts: postCount.count ?? 0,
              members: memberRows.data?.length ?? 0,
            })}
          />
        </section>
      </div>
    </AccountLayout>
  );
}

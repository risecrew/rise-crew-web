-- pgTAP tests for the team spaces: public.teams, public.team_members and
-- public.team_posts. Every cell of the table in spec section 4, asked of the
-- database directly, because a Data API call goes straight here without
-- passing through the site. Run with `pnpm db:test`. Everything rolls back.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   guest       7e590000-0000-4000-8000-000000000001  finished sign-up, in no team
--   unfinished  7e590000-0000-4000-8000-000000000002  has not finished signing up
--   member A    7e590000-0000-4000-8000-000000000003  in team A
--   member B    7e590000-0000-4000-8000-000000000004  in team B
--   operator    7e590000-0000-4000-8000-000000000005  in no team
--   blocked     7e590000-0000-4000-8000-000000000006  member in team A, blocked
--   demoted     7e590000-0000-4000-8000-000000000007  member in team A, demoted later
--   removed     7e590000-0000-4000-8000-000000000008  member in team A, removed later
--   leaver      7e590000-0000-4000-8000-000000000009  member in team A, deletes the account
--   admin       7e590000-0000-4000-8000-00000000000a  in no team
--   member X    7e590000-0000-4000-8000-00000000000b  member in no team, added later
--
-- Teams: A ...a01 and B ...b01 are published, U ...c01 is not.
-- Posts in team A: ...d01 public, ...d02 signed_in, ...d03 public and hidden,
-- ...d06 public by the leaver. ...d04 is a public post in team U, ...d05 a
-- public post in team B, ...d07 signed_in in team U.

begin;

create extension if not exists pgtap with schema extensions;

select plan(110);

-- How many rows a statement touched, as the caller. Row level security answers
-- an update it does not allow with zero rows, not an error.
create function public._t_rows(statement text)
returns integer
language plpgsql
as $$
declare
  touched integer;
begin
  execute statement;
  get diagnostics touched = row_count;
  return touched;
end;
$$;
grant execute on function public._t_rows(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('7e590000-0000-4000-8000-000000000001', 'pgtap-team-guest@example.test'),
  ('7e590000-0000-4000-8000-000000000002', 'pgtap-team-unfinished@example.test'),
  ('7e590000-0000-4000-8000-000000000003', 'pgtap-team-a@example.test'),
  ('7e590000-0000-4000-8000-000000000004', 'pgtap-team-b@example.test'),
  ('7e590000-0000-4000-8000-000000000005', 'pgtap-team-operator@example.test'),
  ('7e590000-0000-4000-8000-000000000006', 'pgtap-team-blocked@example.test'),
  ('7e590000-0000-4000-8000-000000000007', 'pgtap-team-demoted@example.test'),
  ('7e590000-0000-4000-8000-000000000008', 'pgtap-team-removed@example.test'),
  ('7e590000-0000-4000-8000-000000000009', 'pgtap-team-leaver@example.test'),
  ('7e590000-0000-4000-8000-00000000000a', 'pgtap-team-admin@example.test'),
  ('7e590000-0000-4000-8000-00000000000b', 'pgtap-team-x@example.test');

update public.user_roles set role = 'member'
 where user_id in ('7e590000-0000-4000-8000-000000000003',
                   '7e590000-0000-4000-8000-000000000004',
                   '7e590000-0000-4000-8000-000000000006',
                   '7e590000-0000-4000-8000-000000000007',
                   '7e590000-0000-4000-8000-000000000008',
                   '7e590000-0000-4000-8000-000000000009',
                   '7e590000-0000-4000-8000-00000000000b');
update public.user_roles set role = 'operator'
 where user_id = '7e590000-0000-4000-8000-000000000005';
update public.user_roles set role = 'admin'
 where user_id = '7e590000-0000-4000-8000-00000000000a';

-- Everyone but the unfinished account finishes signing up.
insert into public.consents (user_id, kind, granted, policy_version)
select u.id, k.kind, true, 'pgtap'
from auth.users as u
cross join (values ('privacy'), ('age14')) as k (kind)
where u.email like 'pgtap-team-%' and u.email <> 'pgtap-team-unfinished@example.test';

update public.profiles
   set last_name = '시', first_name = '험', occupation = 'founder', onboarded_at = now()
 where email like 'pgtap-team-%' and email <> 'pgtap-team-unfinished@example.test';

insert into public.teams (id, slug, name, field, cohort, tagline, intro, is_published) values
  ('7e590000-0000-4000-8000-000000000a01', 'pgtap-a', '팀 A', 'other', 1, '한 줄', '소개', true),
  ('7e590000-0000-4000-8000-000000000b01', 'pgtap-b', '팀 B', 'other', 2, '한 줄', '소개', true),
  ('7e590000-0000-4000-8000-000000000c01', 'pgtap-u', '팀 U', 'other', 2, '한 줄', '소개', false);

insert into public.team_members (team_id, user_id) values
  ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003'),
  ('7e590000-0000-4000-8000-000000000b01', '7e590000-0000-4000-8000-000000000004'),
  ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000006'),
  ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000007'),
  ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000008'),
  ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000009');

insert into public.team_posts (id, team_id, author_id, title, body, visibility, hidden_at) values
  ('7e590000-0000-4000-8000-000000000d01', '7e590000-0000-4000-8000-000000000a01',
   '7e590000-0000-4000-8000-000000000003', '공개 글', '본문', 'public', null),
  ('7e590000-0000-4000-8000-000000000d02', '7e590000-0000-4000-8000-000000000a01',
   '7e590000-0000-4000-8000-000000000003', '가입자 글', '본문', 'signed_in', null),
  ('7e590000-0000-4000-8000-000000000d03', '7e590000-0000-4000-8000-000000000a01',
   '7e590000-0000-4000-8000-000000000003', '숨긴 글', '본문', 'public', now()),
  ('7e590000-0000-4000-8000-000000000d04', '7e590000-0000-4000-8000-000000000c01',
   null, '비공개 팀 글', '본문', 'public', null),
  ('7e590000-0000-4000-8000-000000000d05', '7e590000-0000-4000-8000-000000000b01',
   '7e590000-0000-4000-8000-000000000004', 'B 글', '본문', 'public', null),
  ('7e590000-0000-4000-8000-000000000d06', '7e590000-0000-4000-8000-000000000a01',
   '7e590000-0000-4000-8000-000000000009', '떠나는 사람 글', '본문', 'public', null),
  ('7e590000-0000-4000-8000-000000000d07', '7e590000-0000-4000-8000-000000000c01',
   null, '비공개 팀 가입자 글', '본문', 'signed_in', null);

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select ok((select relrowsecurity from pg_class where oid = 'public.teams'::regclass),
  'teams has row level security on');
select ok((select relrowsecurity from pg_class where oid = 'public.team_members'::regclass),
  'team_members has row level security on');
select ok((select relrowsecurity from pg_class where oid = 'public.team_posts'::regclass),
  'team_posts has row level security on');
select table_privs_are('public', 'team_members', 'anon', array[]::text[],
  'anon has no privilege on team_members');
select table_privs_are('public', 'teams', 'service_role', array[]::text[],
  'the secret key has no privilege on teams');
select table_privs_are('public', 'team_members', 'service_role', array[]::text[],
  'the secret key has no privilege on team_members');
select table_privs_are('public', 'team_posts', 'service_role', array[]::text[],
  'the secret key has no privilege on team_posts');

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select results_eq(
  $$select slug from public.teams where slug like 'pgtap-%' order by slug$$,
  $$values ('pgtap-a'), ('pgtap-b')$$,
  'anon reads published teams only');
select throws_ok('select * from public.team_members', '42501', null,
  'anon cannot read team_members');
select throws_ok('select * from public.profiles', '42501', null,
  'anon cannot read profiles');
select results_eq(
  $$select title from public.team_posts
     where team_id in ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000c01')
     order by title$$,
  $$values ('공개 글'), ('떠나는 사람 글')$$,
  'anon reads public posts of published teams: no signed_in, hidden or unpublished-team post');
select throws_ok('select author_id from public.team_posts', '42501', null,
  'anon cannot read who wrote a post');
select throws_ok(
  $$update public.teams set tagline = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'anon cannot update a team');
select throws_ok(
  $$insert into public.team_posts (team_id, title) values ('7e590000-0000-4000-8000-000000000a01', 'x')$$,
  '42501', null, 'anon cannot post');
select is(public.team_signed_in_post_count('7e590000-0000-4000-8000-000000000a01'), 1,
  'anon gets the count of signed_in posts of a published team, hidden ones left out');
select is(public.team_signed_in_post_count('7e590000-0000-4000-8000-000000000c01'), 0,
  'the count is 0 for an unpublished team');
select is(public.team_signed_in_post_count('7e590000-0000-4000-8000-0000000000ff'), 0,
  'the count is 0 for a team that does not exist');

reset role;

-- ---------------------------------------------------------------------------
-- Reading as a signed-in account outside the team
-- ---------------------------------------------------------------------------

set local role authenticated;

-- A finished guest.
set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000001","role":"authenticated"}';

select results_eq(
  $$select title from public.team_posts
     where team_id = '7e590000-0000-4000-8000-000000000a01' order by title$$,
  $$values ('가입자 글'), ('공개 글'), ('떠나는 사람 글')$$,
  'a finished guest reads public and signed_in posts, not hidden ones');
select is_empty(
  $$select id from public.team_posts where team_id = '7e590000-0000-4000-8000-000000000c01'$$,
  'a finished guest reads nothing from an unpublished team');
select is_empty(
  $$select id from public.teams where id = '7e590000-0000-4000-8000-000000000c01'$$,
  'a finished guest does not see an unpublished team');
select is_empty(
  $$select team_id from public.team_members$$,
  'a guest sees no team_members row');
select throws_ok('select author_id from public.team_posts', '42501', null,
  'a signed-in account cannot read who wrote a post');
select is(public.team_signed_in_post_count('7e590000-0000-4000-8000-000000000c01'), 0,
  'the count stays 0 for an unpublished team when signed in');

-- An account that has not finished signing up.
set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000002","role":"authenticated"}';

select results_eq(
  $$select title from public.team_posts
     where team_id = '7e590000-0000-4000-8000-000000000a01' order by title$$,
  $$values ('공개 글'), ('떠나는 사람 글')$$,
  'an unfinished account reads public posts only');

-- A blocked account, even a member of the team and even with a stale claim.
set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000006","role":"authenticated","app_role":"member","blocked":false}';

reset role;
update public.user_roles set blocked_at = now()
 where user_id = '7e590000-0000-4000-8000-000000000006';
set local role authenticated;

select results_eq(
  $$select title from public.team_posts
     where team_id = '7e590000-0000-4000-8000-000000000a01' order by title$$,
  $$values ('공개 글'), ('떠나는 사람 글')$$,
  'a blocked account reads public posts only, even as a member of the team');
select is(
  public._t_rows($$update public.teams set tagline = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  0, 'a blocked member cannot update the team');
select is(
  public._t_rows($$update public.team_posts set title = 'x' where id = '7e590000-0000-4000-8000-000000000d01'$$),
  0, 'a blocked member cannot update a post');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000006', 'x')$$,
  '42501', null, 'a blocked member cannot post');

-- ---------------------------------------------------------------------------
-- A member of another team
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000004","role":"authenticated"}';

select is(
  public._t_rows($$update public.teams set tagline = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  0, 'a team B member cannot update team A');
select is(
  public._t_rows($$update public.team_posts set title = 'x' where id = '7e590000-0000-4000-8000-000000000d01'$$),
  0, 'a team B member cannot update a team A post');
select is(
  public._t_rows($$delete from public.team_posts where id = '7e590000-0000-4000-8000-000000000d01'$$),
  0, 'a team B member cannot delete a team A post');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000004', 'x')$$,
  '42501', null, 'a team B member cannot post in team A');
select throws_ok(
  $$update public.team_posts set hidden_at = now() where id = '7e590000-0000-4000-8000-000000000d05'$$,
  '42501', null, 'a member cannot hide even their own team''s post');

-- ---------------------------------------------------------------------------
-- A member of the team
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000003","role":"authenticated"}';

select results_eq(
  $$select title from public.team_posts
     where team_id = '7e590000-0000-4000-8000-000000000a01' order by title$$,
  $$values ('가입자 글'), ('공개 글'), ('떠나는 사람 글'), ('숨긴 글')$$,
  'a team member sees every post of the team, hidden ones included');
select results_eq(
  $$select team_id from public.team_members$$,
  $$values ('7e590000-0000-4000-8000-000000000a01'::uuid)$$,
  'a member sees only their own team_members row');

select is(
  public._t_rows($$update public.teams
     set tagline = '새 한 줄', intro = '새 소개', logo_path = '7e590000-0000-4000-8000-000000000a01/7e590000-0000-4000-8000-000000000020.png',
         links = '[{"kind":"homepage","url":"https://a.example.test"}]'
   where id = '7e590000-0000-4000-8000-000000000a01'$$),
  1, 'a team member can change tagline, intro, logo and links');

select throws_ok(
  $$update public.teams set name = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'a team member cannot change the name');
select throws_ok(
  $$update public.teams set slug = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'a team member cannot change the slug');
select throws_ok(
  $$update public.teams set field = 'x' where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'a team member cannot change the field');
select throws_ok(
  $$update public.teams set cohort = 9 where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'a team member cannot change the cohort');
select throws_ok(
  $$update public.teams set is_published = false where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'a team member cannot change whether the team is published');
select throws_ok(
  $$insert into public.teams (slug, name, field, cohort) values ('pgtap-new', 'x', 'other', 1)$$,
  '42501', null, 'a team member cannot create a team');
select throws_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-00000000000b')$$,
  '42501', null, 'a team member cannot add a member');
select is(
  public._t_rows($$delete from public.team_members
     where user_id = '7e590000-0000-4000-8000-000000000003'$$),
  0, 'a team member cannot remove a member, even themselves');

select throws_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000001')$$,
  '42501', null, 'adding a guest as a non-operator says the same as adding anyone: no role is revealed');

select lives_ok(
  $$insert into public.team_posts (id, team_id, author_id, title, body, visibility)
    values ('7e590000-0000-4000-8000-000000000e01', '7e590000-0000-4000-8000-000000000a01',
            '7e590000-0000-4000-8000-000000000003', '새 글', '본문', 'signed_in')$$,
  'a team member can post with a chosen id and visibility');
select is(
  (select visibility::text from public.team_posts where id = '7e590000-0000-4000-8000-000000000e01'),
  'signed_in', 'the chosen visibility is kept');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000004', 'x')$$,
  '42501', null, 'a team member cannot post in someone else''s name');
select throws_ok(
  $$insert into public.team_posts (team_id, title) values ('7e590000-0000-4000-8000-000000000a01', 'x')$$,
  '42501', null, 'a post must say who wrote it');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title, hidden_at)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003', 'x', now())$$,
  '42501', null, 'a team member cannot post as hidden');

select is(
  public._t_rows($$update public.team_posts set visibility = 'public'
     where id = '7e590000-0000-4000-8000-000000000e01'$$),
  1, 'a team member can change the visibility');
select is(
  (select edited_at from public.team_posts where id = '7e590000-0000-4000-8000-000000000e01'),
  null::timestamptz, 'changing the visibility alone does not mark the post as edited');
select is(
  public._t_rows($$update public.team_posts set title = '고친 글'
     where id = '7e590000-0000-4000-8000-000000000e01'$$),
  1, 'a team member can edit a post');
select isnt(
  (select edited_at from public.team_posts where id = '7e590000-0000-4000-8000-000000000e01'),
  null::timestamptz, 'changing the title marks the post as edited');

select throws_ok(
  $$update public.team_posts set hidden_at = now() where id = '7e590000-0000-4000-8000-000000000e01'$$,
  '42501', null, 'a team member cannot hide a post');
select throws_ok(
  $$update public.team_posts set hidden_at = null where id = '7e590000-0000-4000-8000-000000000d03'$$,
  '42501', null, 'a team member cannot bring back a hidden post');
select throws_ok(
  $$update public.team_posts set team_id = '7e590000-0000-4000-8000-000000000b01'
     where id = '7e590000-0000-4000-8000-000000000e01'$$,
  '42501', null, 'a team member cannot move a post to another team');
select throws_ok(
  $$update public.team_posts set author_id = '7e590000-0000-4000-8000-000000000004'
     where id = '7e590000-0000-4000-8000-000000000e01'$$,
  '42501', null, 'a team member cannot change who wrote a post');
select throws_ok(
  $$update public.team_posts set edited_at = null where id = '7e590000-0000-4000-8000-000000000e01'$$,
  '42501', null, 'a team member cannot clear the edited time');
select throws_ok(
  $$update public.team_posts set created_at = now() - interval '1 year'
     where id = '7e590000-0000-4000-8000-000000000e01'$$,
  '42501', null, 'a team member cannot backdate a post');

select is(
  public._t_rows($$delete from public.team_posts where id = '7e590000-0000-4000-8000-000000000e01'$$),
  1, 'a team member can delete a post');

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------

select throws_ok(
  $$update public.teams set links = '[{"kind":"homepage","url":"javascript:alert(1)"}]'
     where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'a javascript: link is refused');
select throws_ok(
  $$update public.teams set links = '[{"kind":"blog","url":"https://a.example.test"}]'
     where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'an unknown link kind is refused');
select throws_ok(
  $$update public.teams set links = '{"kind":"homepage","url":"https://a.example.test"}'
     where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'links must be a list');
select throws_ok(
  $$update public.teams set links = (select jsonb_agg(jsonb_build_object('kind', 'other', 'url', 'https://a.example.test/' || i))
                                       from generate_series(1, 6) as i)
     where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'a sixth link is refused');
select throws_ok(
  $$update public.teams set logo_path = '7e590000-0000-4000-8000-000000000b01/7e590000-0000-4000-8000-000000000020.png'
     where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'a logo path outside the team''s own folder is refused');
select throws_ok(
  $$update public.teams set tagline = repeat('가', 81) where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'an 81-character tagline is refused');
select throws_ok(
  $$update public.teams set intro = repeat('가', 2001) where id = '7e590000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'a 2,001-character intro is refused');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003', repeat('가', 101))$$,
  '23514', null, 'a 101-character title is refused');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003', '   ')$$,
  '23514', null, 'a blank title is refused');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title, body)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003', 'x', repeat('가', 5001))$$,
  '23514', null, 'a 5,001-character body is refused');
select throws_ok(
  $$insert into public.team_posts (id, team_id, author_id, title, photo_paths)
    values ('7e590000-0000-4000-8000-000000000e02', '7e590000-0000-4000-8000-000000000a01',
            '7e590000-0000-4000-8000-000000000003', 'x',
            (select array_agg('7e590000-0000-4000-8000-000000000a01/7e590000-0000-4000-8000-000000000e02/7e590000-0000-4000-8000-0000000000' || i || '.png')
               from generate_series(10, 14) as i))$$,
  '23514', null, 'a fifth photo is refused');
select throws_ok(
  $$insert into public.team_posts (id, team_id, author_id, title, photo_paths)
    values ('7e590000-0000-4000-8000-000000000e03', '7e590000-0000-4000-8000-000000000a01',
            '7e590000-0000-4000-8000-000000000003', 'x',
            array['7e590000-0000-4000-8000-000000000b01/7e590000-0000-4000-8000-000000000d05/7e590000-0000-4000-8000-000000000010.png'])$$,
  '23514', null, 'a photo path of another post is refused');
select lives_ok(
  $$insert into public.team_posts (id, team_id, author_id, title, photo_paths)
    values ('7e590000-0000-4000-8000-000000000e04', '7e590000-0000-4000-8000-000000000a01',
            '7e590000-0000-4000-8000-000000000003', 'x',
            array['7e590000-0000-4000-8000-000000000a01/7e590000-0000-4000-8000-000000000e04/7e590000-0000-4000-8000-000000000010.png'])$$,
  'a photo path under the post itself is accepted');

-- ---------------------------------------------------------------------------
-- An operator and an admin
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000005","role":"authenticated"}';

select lives_ok(
  $$insert into public.teams (slug, name, field, cohort) values ('pgtap-new', '새 팀', 'other', 3)$$,
  'an operator can create a team');
select is(
  (select is_published from public.teams where slug = 'pgtap-new'),
  false, 'a new team starts unpublished');
select throws_ok(
  $$insert into public.teams (slug, name, field, cohort) values ('Has-Capitals', 'x', 'other', 1)$$,
  '23514', null, 'a slug with capitals is refused');
select throws_ok(
  $$insert into public.teams (slug, name, field, cohort) values ('pgtap-new', 'x', 'other', 1)$$,
  '23505', null, 'a duplicate slug is refused');
select throws_ok(
  $$insert into public.teams (slug, name, field, cohort) values ('pgtap-zero', 'x', 'other', 0)$$,
  '23514', null, 'cohort 0 is refused');
select is(
  public._t_rows($$update public.teams set is_published = true, name = '새 이름', slug = 'pgtap-new2', field = 'mobility', cohort = 4
     where slug = 'pgtap-new'$$),
  1, 'an operator can change name, slug, field, cohort and publishing');
select is(
  public._t_rows($$update public.teams set intro = '운영진이 고친 소개'
     where id = '7e590000-0000-4000-8000-000000000a01'$$),
  1, 'an operator can change the intro');

select results_eq(
  $$select title from public.team_posts
     where team_id = '7e590000-0000-4000-8000-000000000c01' order by title$$,
  $$values ('비공개 팀 가입자 글'), ('비공개 팀 글')$$,
  'an operator reads the posts of an unpublished team');
select is(
  public._t_rows($$update public.team_posts set hidden_at = now() where id = '7e590000-0000-4000-8000-000000000d05'$$),
  1, 'an operator can hide a post');
select is(
  (select edited_at from public.team_posts where id = '7e590000-0000-4000-8000-000000000d05'),
  null::timestamptz, 'hiding does not mark the post as edited');
select is(
  public._t_rows($$update public.team_posts set hidden_at = null where id = '7e590000-0000-4000-8000-000000000d05'$$),
  1, 'an operator can bring a post back');
select throws_ok(
  $$update public.team_posts set title = 'x' where id = '7e590000-0000-4000-8000-000000000d05'$$,
  '42501', null, 'an operator outside the team cannot edit a post title');
select throws_ok(
  $$update public.team_posts set body = 'x' where id = '7e590000-0000-4000-8000-000000000d05'$$,
  '42501', null, 'an operator outside the team cannot edit a post body');
select throws_ok(
  $$update public.team_posts set visibility = 'signed_in' where id = '7e590000-0000-4000-8000-000000000d05'$$,
  '42501', null, 'an operator outside the team cannot change who can read a post');
select throws_ok(
  $$insert into public.team_posts (team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000b01', '7e590000-0000-4000-8000-000000000005', 'x')$$,
  '42501', null, 'an operator outside the team cannot post');

select throws_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000001')$$,
  'P0001', 'team members must be at least member', 'adding a guest to a team is refused');
select throws_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000a01', '7e590000-0000-4000-8000-000000000003')$$,
  '23505', null, 'adding someone already in the team is refused');
select throws_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000b01', '7e590000-0000-4000-8000-000000000006')$$,
  'P0001', 'team members must be at least member', 'adding a blocked account is refused');
select lives_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000b01', '7e590000-0000-4000-8000-00000000000b')$$,
  'an operator can add a member to a team');
select is(
  (select count(*)::integer from public.team_members
    where team_id = '7e590000-0000-4000-8000-000000000b01'),
  2, 'an operator sees every member of a team');

-- An operator who is also in the team can write as a team member.
select lives_ok(
  $$insert into public.team_members (team_id, user_id)
    values ('7e590000-0000-4000-8000-000000000b01', '7e590000-0000-4000-8000-000000000005')$$,
  'an operator can join a team');
select lives_ok(
  $$insert into public.team_posts (id, team_id, author_id, title)
    values ('7e590000-0000-4000-8000-000000000e05', '7e590000-0000-4000-8000-000000000b01',
            '7e590000-0000-4000-8000-000000000005', '운영진이 쓴 글')$$,
  'an operator in the team can post');
select is(
  public._t_rows($$delete from public.team_members
     where user_id = '7e590000-0000-4000-8000-000000000005'$$),
  1, 'an operator can remove a member');
select is(
  public._t_rows($$delete from public.team_posts where id = '7e590000-0000-4000-8000-000000000e05'$$),
  1, 'an operator can delete a post without being in the team');

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  public._t_rows($$update public.team_posts set hidden_at = now() where id = '7e590000-0000-4000-8000-000000000d05'$$),
  1, 'an admin can hide a post');
select is(
  public._t_rows($$update public.team_posts set hidden_at = null where id = '7e590000-0000-4000-8000-000000000d05'$$),
  1, 'an admin can bring a post back');
select results_eq(
  $$select slug from public.teams where id = '7e590000-0000-4000-8000-000000000c01'$$,
  $$values ('pgtap-u')$$,
  'an admin sees an unpublished team');
select is(
  public._t_rows($$update public.team_posts set hidden_at = now() where id = '7e590000-0000-4000-8000-000000000d02'$$),
  1, 'an admin hides a signed_in post');
select is(public.team_signed_in_post_count('7e590000-0000-4000-8000-000000000a01'), 0,
  'the count leaves out hidden posts');
select is(
  public._t_rows($$update public.team_posts set hidden_at = null where id = '7e590000-0000-4000-8000-000000000d02'$$),
  1, 'an admin brings it back');

-- ---------------------------------------------------------------------------
-- Losing access takes effect on the next statement
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000007","role":"authenticated"}';
select is(
  public._t_rows($$update public.teams set tagline = '강등 전' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  1, 'a member about to be demoted can still write');

reset role;
update public.user_roles set role = 'guest'
 where user_id = '7e590000-0000-4000-8000-000000000007';
set local role authenticated;

select is(
  public._t_rows($$update public.teams set tagline = '강등 후' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  0, 'a member demoted to guest loses write access on the next statement');

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000008","role":"authenticated"}';
select is(
  public._t_rows($$update public.teams set tagline = '빠지기 전' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  1, 'a member about to be removed can still write');

reset role;
delete from public.team_members
 where user_id = '7e590000-0000-4000-8000-000000000008';
set local role authenticated;

select is(
  public._t_rows($$update public.teams set tagline = '빠진 후' where id = '7e590000-0000-4000-8000-000000000a01'$$),
  0, 'a member removed from the team loses write access on the next statement');

-- ---------------------------------------------------------------------------
-- Deleting an account
-- ---------------------------------------------------------------------------

reset role;
delete from auth.users where id = '7e590000-0000-4000-8000-000000000009';

select results_eq(
  $$select title, author_id from public.team_posts where id = '7e590000-0000-4000-8000-000000000d06'$$,
  $$values ('떠나는 사람 글'::text, null::uuid)$$,
  'deleting the author keeps the post and clears who wrote it');
select is_empty(
  $$select user_id from public.team_members where user_id = '7e590000-0000-4000-8000-000000000009'$$,
  'deleting the author takes them out of the team');

select * from finish();
rollback;

-- pgTAP tests for the team storage buckets and their policies. A signed URL is
-- only issued to someone who can read the object's row, so what each role sees
-- in storage.objects is what they can open. Run with `pnpm db:test`.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   guest     7e5a0000-0000-4000-8000-000000000001  finished sign-up, in no team
--   member A  7e5a0000-0000-4000-8000-000000000003  in team A
--   member B  7e5a0000-0000-4000-8000-000000000004  in team B
--   operator  7e5a0000-0000-4000-8000-000000000005  in no team
--
-- Team A ...a01 and team B ...b01 are published, team U ...c01 is not. Posts:
-- ...d01 public, ...d02 signed_in, ...d03 public and hidden (team A), ...d04
-- public (team U).

begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

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

-- What the caller can see of the post photos in these tests, by file name.
create function public._t_photos()
returns setof text
language sql
as $$
  select split_part(name, '/', 3)
  from storage.objects
  where bucket_id = 'team-post-photos' and name like '7e5a0000-%'
  order by 1;
$$;
grant execute on function public._t_photos() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('7e5a0000-0000-4000-8000-000000000001', 'pgtap-store-guest@example.test'),
  ('7e5a0000-0000-4000-8000-000000000003', 'pgtap-store-a@example.test'),
  ('7e5a0000-0000-4000-8000-000000000004', 'pgtap-store-b@example.test'),
  ('7e5a0000-0000-4000-8000-000000000005', 'pgtap-store-operator@example.test');

update public.user_roles set role = 'member'
 where user_id in ('7e5a0000-0000-4000-8000-000000000003',
                   '7e5a0000-0000-4000-8000-000000000004');
update public.user_roles set role = 'operator'
 where user_id = '7e5a0000-0000-4000-8000-000000000005';

insert into public.consents (user_id, kind, granted, policy_version)
select u.id, k.kind, true, 'pgtap'
from auth.users as u
cross join (values ('privacy'), ('age14')) as k (kind)
where u.email like 'pgtap-store-%';

update public.profiles
   set last_name = '시', first_name = '험', occupation = 'founder', onboarded_at = now()
 where email like 'pgtap-store-%';

insert into public.teams (id, slug, name, field, cohort, is_published) values
  ('7e5a0000-0000-4000-8000-000000000a01', 'pgtap-store-a', '팀 A', 'other', 1, true),
  ('7e5a0000-0000-4000-8000-000000000b01', 'pgtap-store-b', '팀 B', 'other', 1, true),
  ('7e5a0000-0000-4000-8000-000000000c01', 'pgtap-store-u', '팀 U', 'other', 1, false);

insert into public.team_members (team_id, user_id) values
  ('7e5a0000-0000-4000-8000-000000000a01', '7e5a0000-0000-4000-8000-000000000003'),
  ('7e5a0000-0000-4000-8000-000000000b01', '7e5a0000-0000-4000-8000-000000000004');

insert into public.team_posts (id, team_id, title, visibility, hidden_at) values
  ('7e5a0000-0000-4000-8000-000000000d01', '7e5a0000-0000-4000-8000-000000000a01', '공개', 'public', null),
  ('7e5a0000-0000-4000-8000-000000000d02', '7e5a0000-0000-4000-8000-000000000a01', '가입자', 'signed_in', null),
  ('7e5a0000-0000-4000-8000-000000000d03', '7e5a0000-0000-4000-8000-000000000a01', '숨김', 'public', now()),
  ('7e5a0000-0000-4000-8000-000000000d04', '7e5a0000-0000-4000-8000-000000000c01', '비공개 팀', 'public', null);

insert into storage.objects (bucket_id, name) values
  ('team-post-photos', '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000d01/public.png'),
  ('team-post-photos', '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000d02/signed.png'),
  ('team-post-photos', '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000d03/hidden.png'),
  ('team-post-photos', '7e5a0000-0000-4000-8000-000000000c01/7e5a0000-0000-4000-8000-000000000d04/unpublished.png'),
  -- Uploaded for a post that does not exist yet.
  ('team-post-photos', '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000dff/orphan.png'),
  -- Names that are not the shape the policies expect must not raise.
  ('team-post-photos', 'not-a-uuid/also-not/odd.png'),
  ('team-logos', '7e5a0000-0000-4000-8000-000000000a01/logo.png');

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------

select results_eq(
  $$select id, public, file_size_limit, allowed_mime_types
      from storage.buckets where id in ('team-logos', 'team-post-photos') order by id$$,
  $$values ('team-logos'::text, true, 2097152::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[]),
           ('team-post-photos'::text, false, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'the buckets carry the exact visibility, size limits and types');

-- ---------------------------------------------------------------------------
-- Reading photos
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select results_eq('select public._t_photos()', $$values ('public.png')$$,
  'anon sees only the photo of a public post: not signed_in, hidden or unpublished-team');
select is(
  (select count(*)::integer from storage.objects where name = 'not-a-uuid/also-not/odd.png'),
  0, 'anon does not see a malformed name, and reading it raises nothing');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000001","role":"authenticated"}';

select results_eq('select public._t_photos()', $$values ('public.png'), ('signed.png')$$,
  'a finished guest sees photos of public and signed_in posts');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000003","role":"authenticated"}';

select results_eq('select public._t_photos()',
  $$values ('hidden.png'), ('orphan.png'), ('public.png'), ('signed.png')$$,
  'a team member sees every photo under the team, so a failed upload can be cleaned up');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000005","role":"authenticated"}';

select results_eq('select public._t_photos()',
  $$values ('hidden.png'), ('orphan.png'), ('public.png'), ('signed.png'), ('unpublished.png')$$,
  'an operator sees every team photo, so one can be removed after its post is deleted');

-- Changing a post to signed_in closes its photo on the next read.
set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000003","role":"authenticated"}';
select is(
  public._t_rows($$update public.team_posts set visibility = 'signed_in'
     where id = '7e5a0000-0000-4000-8000-000000000d01'$$),
  1, 'a team member changes a public post to signed_in');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is_empty('select public._t_photos()',
  'after that, anon sees none of its photos');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000003","role":"authenticated"}';
select is(
  public._t_rows($$update public.team_posts set visibility = 'public'
     where id = '7e5a0000-0000-4000-8000-000000000d01'$$),
  1, 'the team member changes it back');

-- ---------------------------------------------------------------------------
-- Writing photos
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000dee/7e5a0000-0000-4000-8000-000000000011.png')$$,
  'a team member can upload under their own team');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000b01/7e5a0000-0000-4000-8000-000000000dee/7e5a0000-0000-4000-8000-000000000012.png')$$,
  '42501', null, 'a team member cannot upload under another team');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000012.png')$$,
  '42501', null, 'a path without a post folder is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/../7e5a0000-0000-4000-8000-000000000012.png')$$,
  '42501', null, 'a path with .. is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos', 'not-a-uuid/x/y.png')$$,
  '42501', null, 'a malformed path is refused without raising a cast error');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000dee/7e5a0000-0000-4000-8000-000000000013.svg')$$,
  '42501', null, 'a file name with another extension is refused');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000dee/7e5a0000-0000-4000-8000-000000000014.png')$$,
  '42501', null, 'an outsider cannot upload');

-- Direct deletes from storage.objects are switched off outside the Storage
-- server unless this is set; the policies are what is under test here.
set local storage.allow_delete_query = 'true';

select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-post-photos' and name like '7e5a0000-%/public.png'$$),
  0, 'an outsider cannot delete a photo');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000004","role":"authenticated"}';

select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-post-photos' and name like '7e5a0000-%/public.png'$$),
  0, 'a member of another team cannot delete a photo');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000003","role":"authenticated"}';

select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-post-photos' and name like '7e5a0000-%/orphan.png'$$),
  1, 'a team member can delete a photo of their team');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000005","role":"authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-post-photos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000dee/7e5a0000-0000-4000-8000-000000000015.png')$$,
  '42501', null, 'an operator outside the team cannot upload a post photo');
select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-post-photos' and name like '7e5a0000-%/hidden.png'$$),
  1, 'an operator can delete a photo');

-- ---------------------------------------------------------------------------
-- Logos
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000c01/7e5a0000-0000-4000-8000-000000000021.png')$$,
  'an operator can upload a logo');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000003","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000022.webp')$$,
  'a team member can upload their team''s logo');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000b01/7e5a0000-0000-4000-8000-000000000023.png')$$,
  '42501', null, 'a team member cannot upload another team''s logo');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000a01/x/7e5a0000-0000-4000-8000-000000000024.png')$$,
  '42501', null, 'a logo path with an extra folder is refused');
select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-logos'
     and name = '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000022.webp'$$),
  1, 'a team member can delete their team''s logo');

set local request.jwt.claims = '{"sub":"7e5a0000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000025.png')$$,
  '42501', null, 'an outsider cannot upload a logo');
select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-logos' and name = '7e5a0000-0000-4000-8000-000000000a01/logo.png'$$),
  0, 'an outsider cannot delete a logo');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-logos',
    '7e5a0000-0000-4000-8000-000000000a01/7e5a0000-0000-4000-8000-000000000026.png')$$,
  '42501', null, 'anon cannot upload a logo');

reset role;

select * from finish();
rollback;

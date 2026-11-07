-- pgTAP tests for a team's chosen cover photo: the column on public.teams and
-- the team-covers bucket. Run with `pnpm db:test`. Everything rolls back.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   guest     7e5b0000-0000-4000-8000-000000000001  finished sign-up, in no team
--   member A  7e5b0000-0000-4000-8000-000000000003  in team A
--   operator  7e5b0000-0000-4000-8000-000000000005  in no team
-- Team A is ...a01, team B is ...b01.

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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

insert into auth.users (id, email) values
  ('7e5b0000-0000-4000-8000-000000000001', 'pgtap-cover-guest@example.test'),
  ('7e5b0000-0000-4000-8000-000000000003', 'pgtap-cover-a@example.test'),
  ('7e5b0000-0000-4000-8000-000000000005', 'pgtap-cover-operator@example.test');

-- Approved, like everyone these tests sign in as; applying is tested in applicant_approval.
update public.user_roles set role = 'guest'
 where user_id in (select id from auth.users where email like 'pgtap-%');
update public.user_roles set role = 'member'
 where user_id = '7e5b0000-0000-4000-8000-000000000003';
update public.user_roles set role = 'operator'
 where user_id = '7e5b0000-0000-4000-8000-000000000005';

insert into public.teams (id, slug, name, field, cohort, is_published) values
  ('7e5b0000-0000-4000-8000-000000000a01', 'pgtap-cover-a', '팀 A', 'other', 1, true),
  ('7e5b0000-0000-4000-8000-000000000b01', 'pgtap-cover-b', '팀 B', 'other', 1, true);

insert into public.team_members (team_id, user_id) values
  ('7e5b0000-0000-4000-8000-000000000a01', '7e5b0000-0000-4000-8000-000000000003');

insert into storage.objects (bucket_id, name) values
  ('team-covers', '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000030.jpg');

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'team-covers'$$,
  $$values (true, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'the bucket is public, with the size limit and types of a post photo');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select lives_ok('select cover_path from public.teams', 'anon can read which photo is the cover');
select throws_ok(
  $$update public.teams set cover_path = null where id = '7e5b0000-0000-4000-8000-000000000a01'$$,
  '42501', null, 'anon cannot change a cover');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000031.jpg')$$,
  '42501', null, 'anon cannot upload a cover');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5b0000-0000-4000-8000-000000000003","role":"authenticated"}';

select is(
  public._t_rows($$update public.teams
     set cover_path = '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000030.jpg'
   where id = '7e5b0000-0000-4000-8000-000000000a01'$$),
  1, 'a team member can choose their team''s cover');
select throws_ok(
  $$update public.teams
     set cover_path = '7e5b0000-0000-4000-8000-000000000b01/7e5b0000-0000-4000-8000-000000000030.jpg'
   where id = '7e5b0000-0000-4000-8000-000000000a01'$$,
  '23514', null, 'a cover outside the team''s own folder is refused');
select is(
  public._t_rows($$update public.teams
     set cover_path = '7e5b0000-0000-4000-8000-000000000b01/7e5b0000-0000-4000-8000-000000000030.jpg'
   where id = '7e5b0000-0000-4000-8000-000000000b01'$$),
  0, 'a team member cannot change another team''s cover');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000032.jpg',
    '{"mimetype":"image/jpeg","size":5242880}')$$,
  'a team member can upload a cover of exactly 5MB');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000b01/7e5b0000-0000-4000-8000-000000000033.jpg')$$,
  '42501', null, 'a team member cannot upload another team''s cover');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000034.png',
    '{"mimetype":"image/svg+xml","size":10}')$$,
  '42501', null, 'a cover row that says it is SVG is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000035.png',
    '{"mimetype":"image/png","size":5242881}')$$,
  '42501', null, 'a cover row over 5MB is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/x/7e5b0000-0000-4000-8000-000000000036.png')$$,
  '42501', null, 'a cover path with an extra folder is refused');

set local storage.allow_delete_query = 'true';

set local request.jwt.claims = '{"sub":"7e5b0000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-covers'
     and name = '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000030.jpg'$$),
  0, 'an outsider cannot delete a cover');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('team-covers',
    '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000037.jpg')$$,
  '42501', null, 'an outsider cannot upload a cover');

set local request.jwt.claims = '{"sub":"7e5b0000-0000-4000-8000-000000000003","role":"authenticated"}';

select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-covers'
     and name = '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000032.jpg'$$),
  1, 'a team member can delete their team''s cover');

set local request.jwt.claims = '{"sub":"7e5b0000-0000-4000-8000-000000000005","role":"authenticated"}';

select is(
  public._t_rows($$update public.teams set cover_path = null
   where id = '7e5b0000-0000-4000-8000-000000000a01'$$),
  1, 'an operator can take a cover off');
select is(
  public._t_rows($$delete from storage.objects where bucket_id = 'team-covers'
     and name = '7e5b0000-0000-4000-8000-000000000a01/7e5b0000-0000-4000-8000-000000000030.jpg'$$),
  1, 'an operator can delete a cover');

reset role;

select * from finish();
rollback;

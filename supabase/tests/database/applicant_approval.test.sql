-- pgTAP tests for applying and being approved. Run with `pnpm db:test`. Everything rolls back.
-- Fake accounts only (example.test).
--   applicant  7e5f0000-0000-4000-8000-000000000001  finished signing up, not approved
--   approved   7e5f0000-0000-4000-8000-000000000002  guest
--   blocked    7e5f0000-0000-4000-8000-000000000003  guest, blocked

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('7e5f0000-0000-4000-8000-000000000001', 'pgtap-apply-applicant@example.test'),
  ('7e5f0000-0000-4000-8000-000000000002', 'pgtap-apply-approved@example.test'),
  ('7e5f0000-0000-4000-8000-000000000003', 'pgtap-apply-blocked@example.test');

select is(
  (select role::text from public.user_roles
    where user_id = '7e5f0000-0000-4000-8000-000000000001'),
  'applicant', 'a new account starts as an applicant');

update public.user_roles set role = 'guest'
 where user_id in ('7e5f0000-0000-4000-8000-000000000002', '7e5f0000-0000-4000-8000-000000000003');
update public.user_roles set blocked_at = now()
 where user_id = '7e5f0000-0000-4000-8000-000000000003';

alter table public.profiles disable trigger user;
update public.profiles
   set last_name = '시험', first_name = '계정', occupation = 'founder', onboarded_at = now()
 where id in ('7e5f0000-0000-4000-8000-000000000001', '7e5f0000-0000-4000-8000-000000000002',
              '7e5f0000-0000-4000-8000-000000000003');
alter table public.profiles enable trigger user;

delete from public.notices;
insert into public.notices (title_ko, body_ko) values ('공지', '본문');
insert into public.teams (id, slug, name, field, cohort, is_published) values
  ('7e5f0000-0000-4000-8000-000000000a01', 'pgtap-apply', '팀', 'other', 1, true);
insert into public.team_posts (team_id, author_id, title, visibility) values
  ('7e5f0000-0000-4000-8000-000000000a01', '7e5f0000-0000-4000-8000-000000000002', '가입자 글', 'signed_in'),
  ('7e5f0000-0000-4000-8000-000000000a01', '7e5f0000-0000-4000-8000-000000000002', '공개 글', 'public');
insert into storage.objects (bucket_id, name) values
  ('notice-files', '7e5f0000-0000-4000-8000-00000000c001.pdf');

select is(
  (select public from storage.buckets where id = 'notice-files'), false,
  'notice files are not public');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.notices', '42501', null, 'anon cannot read notices');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'notice-files'), 0,
  'anon sees no notice files');
select is(
  (select count(*)::integer from public.team_posts where team_id = '7e5f0000-0000-4000-8000-000000000a01'), 1,
  'anon reads only the public post');
select is((select count(*)::integer from public.activities) >= 15, true, 'anon still reads activities');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5f0000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::integer from public.notices), 0, 'an applicant reads no notices');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'notice-files'), 0,
  'an applicant sees no notice files');
select is(
  (select count(*)::integer from public.team_posts where team_id = '7e5f0000-0000-4000-8000-000000000a01'), 1,
  'an applicant reads only the public post');
select is((select count(*)::integer from public.activities) >= 15, true, 'an applicant reads activities');
select lives_ok(
  $$update public.profiles set school = '학교' where id = '7e5f0000-0000-4000-8000-000000000001'$$,
  'an applicant can still edit their own profile');
select throws_ok(
  $$update public.user_roles set role = 'guest' where user_id = '7e5f0000-0000-4000-8000-000000000001'$$,
  '42501', null, 'an applicant cannot approve themselves');

-- Even a token claiming otherwise.
set local request.jwt.claims = '{"sub":"7e5f0000-0000-4000-8000-000000000001","role":"authenticated","app_role":"operator"}';
select is((select count(*)::integer from public.notices), 0, 'a forged claim changes nothing');

set local request.jwt.claims = '{"sub":"7e5f0000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::integer from public.notices), 1, 'an approved account reads notices');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'notice-files'), 1,
  'an approved account can reach notice files');
select is(
  (select count(*)::integer from public.team_posts where team_id = '7e5f0000-0000-4000-8000-000000000a01'), 2,
  'an approved account reads both posts');

set local request.jwt.claims = '{"sub":"7e5f0000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::integer from public.notices), 0, 'a blocked account reads no notices');

select * from finish();
rollback;

-- pgTAP tests for activities, notices and the activity-photos bucket. Run with `pnpm db:test`.
-- Everything rolls back. Fake accounts only (example.test).
--   member    7e5c0000-0000-4000-8000-000000000001
--   operator  7e5c0000-0000-4000-8000-000000000002
--   blocked   7e5c0000-0000-4000-8000-000000000003  operator, blocked

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

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
  ('7e5c0000-0000-4000-8000-000000000001', 'pgtap-board-member@example.test'),
  ('7e5c0000-0000-4000-8000-000000000002', 'pgtap-board-operator@example.test'),
  ('7e5c0000-0000-4000-8000-000000000003', 'pgtap-board-blocked@example.test');

update public.user_roles set role = 'member'
 where user_id = '7e5c0000-0000-4000-8000-000000000001';
update public.user_roles set role = 'operator'
 where user_id in ('7e5c0000-0000-4000-8000-000000000002', '7e5c0000-0000-4000-8000-000000000003');
update public.user_roles set blocked_at = now()
 where user_id = '7e5c0000-0000-4000-8000-000000000003';

-- Notices others left on a local stack do not count here. All of this rolls back.
delete from public.notices;
insert into public.notices (id, title_ko, body_ko) values
  ('7e5c0000-0000-4000-8000-00000000a001', '기존 공지', '본문');
insert into storage.objects (bucket_id, name) values
  ('activity-photos', '7e5c0000-0000-4000-8000-00000000b001.jpg');

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'activity-photos'$$,
  $$values (true, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'the bucket is public, with the same limits as a post photo');
-- The moved rows went in together, so they share a created_at. Anything added later does not.
select is(
  (select count(*)::integer from public.activities
    where created_at = (select min(created_at) from public.activities)),
  15, 'the 15 activities moved over');
select is(
  (select count(*)::integer from public.activities where is_planned), 2,
  'the two planned events stay planned');
select is(
  (select count(*)::integer from public.activities where date is null), 1,
  'the one undated activity stays undated');

-- Anyone can read. Nobody but an operator writes.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select ok((select count(*) from public.activities) >= 15, 'anon reads activities');
select is((select count(*)::integer from public.notices), 1, 'anon reads notices');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko) values ('x', 'x')$$,
  '42501', null, 'anon cannot write a notice');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('x', 'x')$$,
  '42501', null, 'anon cannot write an activity');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('activity-photos', '7e5c0000-0000-4000-8000-00000000b002.jpg')$$,
  '42501', null, 'anon cannot upload a photo');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000001","role":"authenticated"}';

select is((select count(*)::integer from public.notices), 1, 'a member reads notices');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko) values ('x', 'x')$$,
  '42501', null, 'a member cannot write a notice');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('x', 'x')$$,
  '42501', null, 'a member cannot write an activity');
select is(
  public._t_rows($$update public.notices set title_ko = 'x'$$), 0, 'a member changes no notice');
select is(public._t_rows($$delete from public.notices$$), 0, 'a member deletes no notice');
select is(public._t_rows($$delete from public.activities$$), 0, 'a member deletes no activity');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('activity-photos', '7e5c0000-0000-4000-8000-00000000b002.jpg')$$,
  '42501', null, 'a member cannot upload a photo');

-- A blocked operator, even with a stale claim.
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000003","role":"authenticated","app_role":"operator"}';

select throws_ok(
  $$insert into public.notices (title_ko, body_ko) values ('x', 'x')$$,
  '42501', null, 'a blocked operator cannot write');

-- An operator.
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into public.activities (date, title_ko, city_ko, photo) values
    ('2026-11-06', '새 활동', '서울', '7e5c0000-0000-4000-8000-00000000b001.jpg')$$,
  'an operator can write an activity');
select is(
  public._t_rows($$update public.notices set is_pinned = true$$), 1, 'an operator can pin a notice');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('activity-photos', '7e5c0000-0000-4000-8000-00000000b003.png')$$,
  'an operator can upload a photo');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('activity-photos', 'folder/not-a-uuid.jpg')$$,
  '42501', null, 'a photo elsewhere in the bucket is refused');

-- What the columns accept, whoever writes.
select lives_ok(
  $$insert into public.activities (date, title_ko, city_ko) values ('2026', 'a', 'b'), ('2026-11', 'a', 'b')$$,
  'a year, or a year and month, is a date');
select throws_ok(
  $$insert into public.activities (date, title_ko, city_ko) values ('2026-13', 'a', 'b')$$,
  '23514', null, 'there is no month 13');
select throws_ok(
  $$insert into public.activities (date, title_ko, city_ko) values ('2026-02-30', 'a', 'b')$$,
  '23514', null, 'there is no February 30');
select throws_ok(
  $$insert into public.activities (date, title_ko, city_ko) values ('2026-1', 'a', 'b')$$,
  '23514', null, 'a month has two digits');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('', 'b')$$,
  '23514', null, 'a title in Korean is required');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, summary_ko) values ('a', 'b', repeat('가', 501))$$,
  '23514', null, 'a summary is at most 500 characters');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, photo) values ('a', 'b', 'https://example.test/a.jpg')$$,
  '23514', null, 'a photo is not an address elsewhere');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko) values ('a', repeat('가', 5001))$$,
  '23514', null, 'a notice is at most 5000 characters');
select lives_ok(
  $$delete from public.activities$$, 'an operator can delete, including moved activities');

select * from finish();
rollback;

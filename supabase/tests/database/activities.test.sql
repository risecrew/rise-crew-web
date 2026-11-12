-- pgTAP tests for activities and the activity-photos bucket, and that the notices are gone. Run with
-- `pnpm db:test`.
-- Everything rolls back. Fake accounts only (example.test).
--   member    7e5c0000-0000-4000-8000-000000000001
--   operator  7e5c0000-0000-4000-8000-000000000002
--   blocked   7e5c0000-0000-4000-8000-000000000003  operator, blocked

begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

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

insert into storage.objects (bucket_id, name) values
  ('activity-photos', '7e5c0000-0000-4000-8000-00000000b001.jpg');

-- The notice board was removed (20261110120000_drop_notices.sql).
select hasnt_table('public', 'notices', 'there is no notices table');
select is(
  (select count(*)::integer from storage.buckets where id = 'notice-files'), 0,
  'there is no notice-files bucket');

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'activity-photos'$$,
  $$values (true, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'the bucket is public, with the same limits as a post photo');
-- The moved rows went in together, so they share a created_at. Anything added later does not.
select is(
  (select count(*)::integer from public.activities
    where created_at = (select min(created_at) from public.activities)),
  13, 'the 15 activities moved over, less the London IR and the showcase that never happened');
select is(
  (select count(*)::integer from public.activities where is_planned), 1,
  'the one planned event left stays planned');
select is(
  (select date from public.activities where title_ko = 'TECHFEST Vietnam 2025'),
  '2025-12-12', 'TECHFEST Vietnam has its date and its official name');
select is(
  (select photo from public.activities where title_ko = '2025 세미나'),
  '/images/activities/seminar-2025-11.jpg', 'the 2025 seminar is there with its photo');

-- Anyone can read. Nobody but an operator writes.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select ok((select count(*) from public.activities) >= 15, 'anon reads activities');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('x', 'x')$$,
  '42501', null, 'anon cannot write an activity');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('activity-photos', '7e5c0000-0000-4000-8000-00000000b002.jpg')$$,
  '42501', null, 'anon cannot upload a photo');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('x', 'x')$$,
  '42501', null, 'a member cannot write an activity');
select is(public._t_rows($$delete from public.activities$$), 0, 'a member deletes no activity');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('activity-photos', '7e5c0000-0000-4000-8000-00000000b002.jpg')$$,
  '42501', null, 'a member cannot upload a photo');

-- A blocked operator, even with a stale claim.
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000003","role":"authenticated","app_role":"operator"}';

select throws_ok(
  $$insert into public.activities (title_ko, city_ko) values ('x', 'x')$$,
  '42501', null, 'a blocked operator cannot write');

-- An operator.
set local request.jwt.claims = '{"sub":"7e5c0000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into public.activities (date, title_ko, city_ko, photo) values
    ('2026-11-06', '새 활동', '서울', '7e5c0000-0000-4000-8000-00000000b001.jpg')$$,
  'an operator can write an activity');
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
-- The details of an activity's own page (20261110130000_activity_details.sql).
select throws_ok(
  $$insert into public.activities (date, end_date, title_ko, city_ko) values ('2026-11-06', '2026-11-05', 'a', 'b')$$,
  '23514', null, 'an activity cannot end before it starts');
select throws_ok(
  $$insert into public.activities (end_date, title_ko, city_ko) values ('2026-11-05', 'a', 'b')$$,
  '23514', null, 'an end date needs a start date');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, results_ko) values ('a', 'b', repeat('가', 1001))$$,
  '23514', null, 'results are at most 1000 characters');
select lives_ok(
  $$insert into public.activities (date, end_date, title_ko, city_ko, body_ko, results_ko)
    values ('2026-11-06', '2026-11-07', 'a', 'b', '본문', '성과')$$,
  'an operator can write the details');
select is(
  (select count(*)::integer from public.activities
    where title_ko like '%·%' or title_ko like '%(1박 2일%' or title_ko like '%ANCHOR 사업단%'),
  0, 'no moved activity keeps an award, a duration or the old name in its title');
-- The gallery (20261110140000_activity_gallery.sql).
select lives_ok(
  $$insert into public.activities (title_ko, city_ko, gallery) values
    ('a', 'b', array['7e5c0000-0000-4000-8000-00000000c001.jpg', '7e5c0000-0000-4000-8000-00000000c002.webp'])$$,
  'an operator can add photos to the gallery');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, gallery) values ('a', 'b', array['/images/activities/a.jpg'])$$,
  '23514', null, 'the gallery holds only uploaded files');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, gallery) values
    ('a', 'b', array['7e5c0000-0000-4000-8000-00000000c001.jpg', '7e5c0000-0000-4000-8000-00000000c001.jpg'])$$,
  '23514', null, 'a photo is in the gallery once');
select throws_ok(
  $$insert into public.activities (title_ko, city_ko, gallery)
    select 'a', 'b', array_agg(gen_random_uuid()::text || '.jpg') from generate_series(1, 41)$$,
  '23514', null, 'the gallery holds at most 40 photos');
select lives_ok(
  $$delete from public.activities$$, 'an operator can delete, including moved activities');

select * from finish();
rollback;

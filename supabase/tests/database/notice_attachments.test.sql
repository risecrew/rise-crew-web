-- pgTAP tests for what a notice can have attached. Run with `pnpm db:test`. Everything rolls back.
-- Fake accounts only (example.test).
--   member    7e5d0000-0000-4000-8000-000000000001
--   operator  7e5d0000-0000-4000-8000-000000000002

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('7e5d0000-0000-4000-8000-000000000001', 'pgtap-notice-member@example.test'),
  ('7e5d0000-0000-4000-8000-000000000002', 'pgtap-notice-operator@example.test');
update public.user_roles set role = 'member'
 where user_id = '7e5d0000-0000-4000-8000-000000000001';
update public.user_roles set role = 'operator'
 where user_id = '7e5d0000-0000-4000-8000-000000000002';

select results_eq(
  $$select public, file_size_limit from storage.buckets where id = 'notice-files'$$,
  $$values (false, 10485760::bigint)$$,
  'the bucket is private and holds files up to 10MB');
select is(
  (select count(*)::integer from storage.buckets, unnest(allowed_mime_types) as mime
    where id = 'notice-files' and mime ~ '(html|svg|zip$|javascript)' and mime <> 'application/hwp+zip'),
  0, 'nothing a browser would run, and no archives');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  'select photo_paths, attachments from public.notices', '42501', null, 'anon cannot read attachments');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c001.pdf')$$,
  '42501', null, 'anon cannot upload a file');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5d0000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c001.pdf')$$,
  '42501', null, 'a member cannot upload a file');

set local request.jwt.claims = '{"sub":"7e5d0000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c002.hwp',
     '{"mimetype":"application/x-hwp","size":100}')$$,
  'an operator can upload a Hangul file');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c003.html')$$,
  '42501', null, 'a file with the wrong ending is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c004.pdf',
     '{"mimetype":"text/html","size":100}')$$,
  '42501', null, 'a file claiming to be a web page is refused');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values
    ('notice-files', '7e5d0000-0000-4000-8000-00000000c005.pdf',
     '{"mimetype":"application/pdf","size":10485761}')$$,
  '42501', null, 'a file over 10MB is refused');

select lives_ok(
  $$insert into public.notices (title_ko, body_ko, photo_paths, attachments) values
    ('a', 'b', array['7e5d0000-0000-4000-8000-00000000c006.jpg'],
     '[{"path":"7e5d0000-0000-4000-8000-00000000c007.pdf","name":"모집 안내.pdf","size":1000}]')$$,
  'a notice can have photos and files');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, photo_paths) values ('a', 'b', array[
    '7e5d0000-0000-4000-8000-00000000c011.jpg', '7e5d0000-0000-4000-8000-00000000c012.jpg',
    '7e5d0000-0000-4000-8000-00000000c013.jpg', '7e5d0000-0000-4000-8000-00000000c014.jpg',
    '7e5d0000-0000-4000-8000-00000000c015.jpg'])$$,
  '23514', null, 'at most 4 photos');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, photo_paths) values ('a', 'b', array['https://example.test/a.jpg'])$$,
  '23514', null, 'a photo is not an address elsewhere');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, photo_paths) values ('a', 'b', array[null]::text[])$$,
  '23514', null, 'a photo is not an empty value');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, attachments) values ('a', 'b',
    (select jsonb_agg(jsonb_build_object('path', '7e5d0000-0000-4000-8000-00000000c020.pdf', 'name', 'a.pdf', 'size', 1))
       from generate_series(1, 6)))$$,
  '23514', null, 'at most 5 files');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, attachments) values ('a', 'b',
    '[{"path":"7e5d0000-0000-4000-8000-00000000c020.html","name":"a.html","size":1}]')$$,
  '23514', null, 'an attachment must be an allowed type');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, attachments) values ('a', 'b',
    '[{"path":"7e5d0000-0000-4000-8000-00000000c020.pdf","name":"","size":1}]')$$,
  '23514', null, 'an attachment has a name');
select throws_ok(
  $$insert into public.notices (title_ko, body_ko, attachments) values ('a', 'b', '{"path":"x"}')$$,
  '23514', null, 'attachments are a list');

select * from finish();
rollback;

-- Activities and notices: what operators publish for everyone to read.
--
-- - Anyone can read, signed in or not. Both tables hold only what the club chose to publish, and
--   everything an operator saves is public at once.
-- - Only operators and admins write. Writes run as the signed-in person, so these policies are the
--   last word and a blocked or demoted operator is refused here whatever the site shows.
-- - English is optional: an empty string means "show the Korean".
-- - activities.photo is either a file in the activity-photos bucket or one of the photos that ships
--   with the site under /images/activities/, which the activities moved from stamps.ts keep using.
-- - activity-photos is public: an activity's photo is on a public page anyway. Size and type limits
--   are bucket settings because photos go straight from the browser to Storage, and the write
--   policies hold them too (see 20261105100100_team_storage.sql).

-- A year, a year and month, or a full date that exists on the calendar. Empty is stored as null.
create function private.valid_activity_date(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if value ~ '^[0-9]{4}$' or value ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    return true;
  end if;
  if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  perform make_date(
    substr(value, 1, 4)::integer, substr(value, 6, 2)::integer, substr(value, 9, 2)::integer);
  return true;
exception
  when datetime_field_overflow or invalid_datetime_format then
    return false;
end;
$$;

revoke execute on function private.valid_activity_date(text)
  from public, anon, authenticated, service_role;
grant execute on function private.valid_activity_date(text) to authenticated;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  date text,
  title_ko text not null,
  title_en text not null default '',
  city_ko text not null,
  city_en text not null default '',
  summary_ko text not null default '',
  summary_en text not null default '',
  photo text,
  photo_alt_ko text not null default '',
  photo_alt_en text not null default '',
  is_planned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_date_valid check (date is null or private.valid_activity_date(date)),
  constraint activities_title_ko_length check (char_length(title_ko) between 1 and 200),
  constraint activities_title_en_length check (char_length(title_en) <= 200),
  constraint activities_city_ko_length check (char_length(city_ko) between 1 and 50),
  constraint activities_city_en_length check (char_length(city_en) <= 50),
  constraint activities_summary_ko_length check (char_length(summary_ko) <= 500),
  constraint activities_summary_en_length check (char_length(summary_en) <= 500),
  constraint activities_photo_alt_length
    check (char_length(photo_alt_ko) <= 200 and char_length(photo_alt_en) <= 200),
  constraint activities_photo_format
    check (photo is null
      or photo ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
      or photo ~ '^/images/activities/[a-z0-9-]+\.(jpg|png|webp)$')
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title_ko text not null,
  title_en text not null default '',
  body_ko text not null,
  body_en text not null default '',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_title_ko_length check (char_length(title_ko) between 1 and 100),
  constraint notices_title_en_length check (char_length(title_en) <= 100),
  constraint notices_body_ko_length check (char_length(body_ko) between 1 and 5000),
  constraint notices_body_en_length check (char_length(body_en) <= 5000)
);

create index notices_listing_idx on public.notices (is_pinned desc, created_at desc);

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function private.set_updated_at();

create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function private.set_updated_at();

alter table public.activities enable row level security;
alter table public.notices enable row level security;

revoke all on table public.activities, public.notices
  from public, anon, authenticated, service_role;

grant select on table public.activities, public.notices to anon, authenticated;
grant insert (date, title_ko, title_en, city_ko, city_en, summary_ko, summary_en, photo,
              photo_alt_ko, photo_alt_en, is_planned),
      update (date, title_ko, title_en, city_ko, city_en, summary_ko, summary_en, photo,
              photo_alt_ko, photo_alt_en, is_planned),
      delete
  on table public.activities to authenticated;
grant insert (title_ko, title_en, body_ko, body_en, is_pinned),
      update (title_ko, title_en, body_ko, body_en, is_pinned),
      delete
  on table public.notices to authenticated;

create policy activities_select_everyone on public.activities
  for select to anon, authenticated using (true);
create policy activities_insert_operator on public.activities
  for insert to authenticated with check ((select private.is_at_least('operator')));
create policy activities_update_operator on public.activities
  for update to authenticated
  using ((select private.is_at_least('operator')))
  with check ((select private.is_at_least('operator')));
create policy activities_delete_operator on public.activities
  for delete to authenticated using ((select private.is_at_least('operator')));

create policy notices_select_everyone on public.notices
  for select to anon, authenticated using (true);
create policy notices_insert_operator on public.notices
  for insert to authenticated with check ((select private.is_at_least('operator')));
create policy notices_update_operator on public.notices
  for update to authenticated
  using ((select private.is_at_least('operator')))
  with check ((select private.is_at_least('operator')));
create policy notices_delete_operator on public.notices
  for delete to authenticated using ((select private.is_at_least('operator')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('activity-photos', 'activity-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Anyone can open a photo by address through the public bucket. This policy is what lets an operator
-- see the row while removing it.
create policy activity_photos_select_operator on storage.objects
  for select to authenticated
  using (bucket_id = 'activity-photos' and (select private.is_at_least('operator')));

create policy activity_photos_insert_operator on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'activity-photos'
    and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
    and private.storage_file_allowed(metadata, 5242880)
    and (select private.is_at_least('operator'))
  );

create policy activity_photos_delete_operator on storage.objects
  for delete to authenticated
  using (bucket_id = 'activity-photos' and (select private.is_at_least('operator')));

-- The activities so far, moved from src/content/data/stamps.ts. That file stays for the home page.
insert into public.activities
  (date, title_ko, title_en, city_ko, city_en, photo, photo_alt_ko, photo_alt_en, is_planned)
values
  ('2025', 'RISE CREW 1기 출범', 'RISE CREW cohort 1 launched', '서울', 'Seoul', null, '', '', false),
  ('2025-11-28', 'ANCHOR 사업단 × 카카오모빌리티 MOU', 'ANCHOR Division × Kakao Mobility MOU', '서울', 'Seoul', null, '', '', false),
  ('2026-01-23', '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍(1박 2일) · 최우수상 안전상점, 우수상 MORTON·곁은', 'Kakao Mobility × RISE CREW roundtable mentoring workshop (2 days) · Top prize Safety Shop, prizes MORTON and Gyeoteun', '시흥', 'Siheung', '/images/activities/workshop-2026-01.jpg', '카카오모빌리티 × RISE CREW 창업아이템 라운드테이블 멘토링 워크숍 단체 사진', 'Group photo at the Kakao Mobility × RISE CREW roundtable mentoring workshop', false),
  ('2026-01-30', 'AI+X 글로벌 창업경진대회 공동 주최 · 아시아 5개국 15팀 본선', 'Co-hosted AI+X Global Startup Competition · 15 finalist teams from 5 Asian countries', '서울', 'Seoul', '/images/activities/aix-contest-2026-01.jpg', 'AI+X 글로벌 창업경진대회 무대 앞 참가자 단체 사진', 'Group photo of participants on stage at the AI+X Global Startup Competition', false),
  ('2026-03-23', '2기 오리엔테이션', 'Cohort 2 orientation', '서울', 'Seoul', null, '', '', false),
  ('2026-04', 'Sushi Tech Tokyo 2026 참가', 'Joined Sushi Tech Tokyo 2026', '도쿄', 'Tokyo', '/images/activities/sushi-tech-tokyo-2026.jpg', 'Sushi Tech Tokyo 2026 간판 앞 RISE CREW 단체 사진', 'RISE CREW in front of the Sushi Tech Tokyo 2026 sign', false),
  ('2026-05', 'BEYOND Expo 2026 참가', 'Joined BEYOND Expo 2026', '마카오', 'Macau', '/images/activities/beyond-expo-macau-2026.jpg', '마카오 성 바울 성당 유적 앞에서 BEYOND Expo 2026 현수막을 든 RISE CREW', 'RISE CREW holding a BEYOND Expo 2026 banner at the Ruins of St. Paul’s, Macau', false),
  (null, 'SKKU × FTU TECHFEST 전시', 'SKKU × FTU TECHFEST exhibition', '베트남', 'Vietnam', '/images/activities/vietnam-2025-12.jpg', '베트남 국가혁신센터(NIC) 앞 RISE CREW 단체 사진', 'RISE CREW at the National Innovation Center (NIC), Vietnam', false),
  ('2025-12-22', 'SMU × SKKU AI 바이브코딩 스프린트 (2025.12.22~26)', 'SMU × SKKU AI Vibe Coding Sprint (Dec 22–26, 2025)', '싱가포르', 'Singapore', '/images/activities/smu-vibe-coding-2025-12.jpg', '싱가포르 마리나베이를 배경으로 SMU × SKKU AI 바이브코딩 스프린트 현수막을 든 단체 사진', 'Group photo with the SMU × SKKU AI Vibe Coding Sprint banner, Marina Bay behind', false),
  ('2026-07', '글로벌 IR과 pre-SEED 투자 유치', 'Global IR and pre-seed fundraising', '런던', 'London', null, '', '', false),
  ('2026-08-28', '2회 SKKU 창업팀 라운드테이블 워크숍(1박 2일, YBM연수원)', '2nd SKKU startup team roundtable workshop (2 days, YBM training center)', '수원', 'Suwon', '/images/activities/roundtable-2026-08.jpg', '2회 SKKU 창업팀 라운드테이블 워크숍 수상팀과 참가자 단체 사진', 'Award winners and participants at the 2nd SKKU startup team roundtable workshop', false),
  ('2026-10', '글로벌 IR과 SEED 투자 유치', 'Global IR and seed fundraising', '쿠알라룸푸르', 'Kuala Lumpur', null, '', '', false),
  ('2026-10', '크리에이터 왕홍 프로그램', 'Creator (wanghong) program', '항저우', 'Hangzhou', null, '', '', false),
  ('2026-11', '창업팀 투자연계 SHOW CASE', 'Investor SHOW CASE for startup teams', '서울', 'Seoul', null, '', '', true),
  ('2026-12', '제2회 AI+X 글로벌 창업경진대회 결선', '2nd AI+X Global Startup Competition final', '서울', 'Seoul', null, '', '', true);

-- Every activity gets a page of its own (wireframe v1.1, §12), so it can say more than a card: the
-- day it ended, what happened, and what came of it. The titles moved from stamps.ts are corrected the
-- way the code was (2026-11-10): names only, the supporter called 앵커사업단, awards and durations out
-- of the title and into results and end dates.
--
-- - end_date is the last day of something that ran over several days; empty is stored as null. It is
--   a date the same way date is, and never before it.
-- - body is plain text with line breaks, as the summary is. results is one outcome per line.
-- - Who may write them is the same as for the other columns: operators, checked by the policies.

alter table public.activities
  add column end_date text,
  add column body_ko text not null default '',
  add column body_en text not null default '',
  add column results_ko text not null default '',
  add column results_en text not null default '',
  add constraint activities_end_date_valid
    check (end_date is null or private.valid_activity_date(end_date)),
  -- Text order is date order for dates written the same way; a day is never before the day it starts.
  add constraint activities_end_date_after
    check (end_date is null or (date is not null and end_date >= date)),
  add constraint activities_body_length
    check (char_length(body_ko) <= 5000 and char_length(body_en) <= 5000),
  add constraint activities_results_length
    check (char_length(results_ko) <= 1000 and char_length(results_en) <= 1000);

grant insert (end_date, body_ko, body_en, results_ko, results_en),
      update (end_date, body_ko, body_en, results_ko, results_en)
  on table public.activities to authenticated;

update public.activities
   set title_ko = '카카오모빌리티 업무협약', title_en = 'Kakao Mobility partnership agreement'
 where title_ko = 'ANCHOR 사업단 × 카카오모빌리티 MOU';

update public.activities
   set title_ko = '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍',
       title_en = 'Kakao Mobility × RISE CREW roundtable mentoring workshop',
       end_date = '2026-01-24',
       results_ko = E'최우수상 안전상점\n우수상 MORTON·곁은',
       results_en = E'Top prize: Safety Shop\nPrizes: MORTON and Gyeoteun'
 where title_ko like '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍(1박 2일)%';

update public.activities
   set title_ko = 'AI+X 글로벌 창업경진대회 공동 주최',
       title_en = 'Co-hosted AI+X Global Startup Competition',
       results_ko = '아시아 5개국 15팀 본선',
       results_en = '15 finalist teams from 5 Asian countries'
 where title_ko = 'AI+X 글로벌 창업경진대회 공동 주최 · 아시아 5개국 15팀 본선';

update public.activities
   set title_ko = 'Sushi Tech Tokyo 2026', title_en = 'Sushi Tech Tokyo 2026'
 where title_ko = 'Sushi Tech Tokyo 2026 참가';

update public.activities
   set title_ko = 'BEYOND Expo 2026', title_en = 'BEYOND Expo 2026'
 where title_ko = 'BEYOND Expo 2026 참가';

-- TECHFEST Vietnam 2025 ran December 12-14, 2025 in Hanoi (20261106120000_activity_corrections.sql).
update public.activities
   set city_ko = '하노이, 베트남', city_en = 'Hanoi, Vietnam', end_date = '2025-12-14'
 where title_ko = 'SKKU × FTU TECHFEST 전시' and date = '2025-12-12';

update public.activities
   set title_ko = 'SMU × SKKU AI 바이브코딩 스프린트',
       title_en = 'SMU × SKKU AI Vibe Coding Sprint',
       end_date = '2025-12-26'
 where title_ko = 'SMU × SKKU AI 바이브코딩 스프린트 (2025.12.22~26)';

update public.activities
   set title_ko = '2회 SKKU 창업팀 라운드테이블 워크숍',
       title_en = '2nd SKKU startup team roundtable workshop',
       end_date = '2026-08-29'
 where title_ko = '2회 SKKU 창업팀 라운드테이블 워크숍(1박 2일, YBM연수원)';

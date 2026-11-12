-- The organizers' copy edits to the activities (2026-11), matching src/content/data/stamps.ts:
--
-- - Event names as the events write them: SusHi Tech Tokyo, TECHFEST Vietnam, 제1회/제2회.
-- - Every place reads "city, country".
-- - Seed rounds in Korean (시드), award names as the teams write them (Safetyshop, KYOT).
-- - Cohort 1 launched in October 2025.
-- - The London IR and the investor showcase did not happen; their rows go. A row with uploaded
--   photos is left for an operator to delete from the management screen, so no file is orphaned.
--
-- Each update matches the title the earlier migrations wrote, so a row an operator has since
-- renamed is left as it is.

update public.activities
   set date = '2025-10', city_ko = '서울, 한국', city_en = 'Seoul, Korea'
 where title_ko = 'RISE CREW 1기 출범' and date = '2025';

update public.activities
   set title_ko = 'SusHi Tech Tokyo 2026', title_en = 'SusHi Tech Tokyo 2026',
       photo_alt_ko = replace(photo_alt_ko, 'Sushi Tech Tokyo', 'SusHi Tech Tokyo'),
       photo_alt_en = replace(photo_alt_en, 'Sushi Tech Tokyo', 'SusHi Tech Tokyo')
 where title_ko = 'Sushi Tech Tokyo 2026';

update public.activities
   set title_ko = 'TECHFEST Vietnam 2025', title_en = 'TECHFEST Vietnam 2025'
 where title_ko = 'SKKU × FTU TECHFEST 전시';

update public.activities
   set title_ko = '제1회 AI+X 글로벌 창업경진대회 공동 주최',
       title_en = 'Co-hosted the 1st AI+X Global Startup Competition'
 where title_ko = 'AI+X 글로벌 창업경진대회 공동 주최';

update public.activities
   set title_ko = '제2회 SKKU 창업팀 라운드테이블 워크숍',
       photo_alt_ko = '제2회 SKKU 창업팀 라운드테이블 워크숍 수상팀과 참가자 단체 사진'
 where title_ko = '2회 SKKU 창업팀 라운드테이블 워크숍';

update public.activities
   set title_ko = '글로벌 IR과 시드 투자 유치'
 where title_ko = '글로벌 IR과 SEED 투자 유치';

update public.activities
   set results_en = E'Top prize: Safetyshop\nPrizes: MORTON and KYOT',
       photo_alt_ko = '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍 단체 사진'
 where title_ko = '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍';

update public.activities
   set city_ko = city_ko || ', 한국', city_en = city_en || ', Korea'
 where city_ko in ('서울', '시흥', '수원');

update public.activities set city_ko = '도쿄, 일본', city_en = 'Tokyo, Japan' where city_ko = '도쿄';
update public.activities set city_ko = '마카오, 중국', city_en = 'Macau, China' where city_ko = '마카오';
update public.activities
   set city_ko = '쿠알라룸푸르, 말레이시아', city_en = 'Kuala Lumpur, Malaysia'
 where city_ko = '쿠알라룸푸르';
update public.activities set city_ko = '항저우, 중국', city_en = 'Hangzhou, China' where city_ko = '항저우';

delete from public.activities
 where title_ko in ('글로벌 IR과 pre-SEED 투자 유치', '창업팀 투자연계 SHOW CASE')
   and photo is null
   and gallery = '{}';

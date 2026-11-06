-- Corrections to the activities moved from stamps.ts, from the club's own photos and the festival's
-- published dates.
--
-- - TECHFEST Vietnam 2025 ran December 12-14, 2025 in Hanoi. Stored as its first day.
-- - The 2025 seminar, from the club's photo archive (taken November 19, 2025).

update public.activities
   set date = '2025-12-12'
 where title_ko = 'SKKU × FTU TECHFEST 전시' and date is null;

insert into public.activities
  (date, title_ko, title_en, city_ko, city_en, photo, photo_alt_ko, photo_alt_en)
values
  ('2025-11-19', '2025 세미나', '2025 Seminar', '서울', 'Seoul',
   '/images/activities/seminar-2025-11.jpg',
   '강의실에서 제품 가설검증과 프로젝트 관리 강연을 듣는 RISE CREW 2025 세미나',
   'RISE CREW members at a talk on product hypothesis testing and project management, 2025 seminar');

# 활동 내역과 공지사항 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영진이 활동 내역과 공지를 직접 올리고, 방문자가 공개 페이지에서 본다.

**Architecture:** `activities`, `notices` 테이블과 공개 버킷 `activity-photos`를 RLS로 지킨다. 쓰기는 운영진 세션의 서버 액션, 사진은 브라우저에서 Storage로 직접 올린다. 공개 읽기는 쿠키 없는 클라이언트로 하고 쓰기 때 `revalidatePath`로 갱신한다.

**Tech Stack:** Next.js 16 App Router, next-intl, Supabase, zod, pgTAP, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-phase2-activities-notices-design.md`

## Global Constraints

- 스위치(`isAuthEnabled()`)가 꺼지면 새 주소는 404, 메뉴에 없음, `/about`은 `stamps.ts`를 읽음.
- 영어 칸은 비어도 된다. 빈 값은 `''`로 저장하고 화면은 한국어로 대체한다.
- 활동 설명 500자, 공지 본문 5000자, 사진 5MB, JPG·PNG·WebP.
- 사진 원본 폴더는 커밋하지 않는다. 고른 사진만 줄이고 메타데이터(위치 포함)를 지워 `public/images/activities/`에 넣는다.
- 마이그레이션은 `supabase migration up --local`로 올린다. `db reset`, `--include-seed` 금지. 개발·운영 DB 반영은 사용자가 "올려"라고 할 때만, 운영 DB는 이번 작업에서 건드리지 않는다.

## Review Focus

1. `2026-13` 같은 없는 날짜와 형식이 틀린 날짜: 폼이 문구로 거절하고 DB도 거절한다. Task 1 pgTAP, Task 2 단위 테스트.
2. 기존 활동(`/images/...` 사진)을 지우거나 사진을 바꿀 때: Storage 삭제를 시도하지 않는다. Task 2 단위 테스트 `isUploadedPhoto`.
3. 사진을 바꾸거나 활동을 지우면 올린 파일도 지운다. Task 3 e2e.
4. 차단된 운영진과 역할이 내려간 운영진: 쓰기가 거부된다. Task 1 pgTAP.
5. 영어가 빈 글의 영어 화면: 한국어가 보이고 빈 제목이 없다. Task 5 e2e.

---

### Task 1: DB

**Files:** Create `supabase/migrations/20261106100000_activities_notices.sql`, `supabase/tests/database/activities_notices.test.sql`

**Interfaces — Produces:**

- `activities(id uuid, date text null, title_ko, title_en, city_ko, city_en, summary_ko, summary_en, photo text null, photo_alt_ko, photo_alt_en, is_planned bool, created_at, updated_at)`
- `notices(id uuid, title_ko, title_en, body_ko, body_en, is_pinned bool, created_at, updated_at)`
- 버킷 `activity-photos`(공개, 5MB, 경로 `{uuid}.{jpg|png|webp}`)

- [ ] pgTAP 작성: anon이 두 테이블을 읽는다. anon·가입자·회원의 쓰기와 사진 올리기 거부, 운영진 허용, 차단된 운영진 거부. `2026-13`, `2026-1`, 빈 `title_ko`, 501자 설명, 형식이 틀린 `photo` 거부. 기존 활동 15건.
- [ ] 실행해 실패 확인: `pnpm db:test`
- [ ] 마이그레이션 작성: RLS는 `private.is_at_least('operator')`, `updated_at` 트리거, `photo` 체크는 `/images/activities/*.(jpg|png|webp)` 또는 버킷 경로, `date` 체크는 연도·연월·연월일과 실제 달력 값. `stamps.ts` 15건 입력(planned 2건은 `is_planned`, 사진은 `photos.ts`의 경로와 대체 텍스트).
- [ ] `supabase migration up --local` 후 `pnpm db:test` 통과, 커밋.

### Task 2: 공용 코드

**Files:** Create `src/lib/board/forms.ts`, `src/lib/board/text.ts`, `src/lib/board/queries.ts`, `src/lib/supabase/public.ts`, `src/lib/board/upload.ts`; Test `tests/lib/board.test.ts`

**Interfaces — Produces:**

- `localized(ko: string, en: string, locale: Locale): string`
- `activitySchema`, `noticeSchema`, `BOARD_LIMITS`
- `isUploadedPhoto(photo: string | null): boolean`, `activityPhotoUrl(photo: string): string`
- `getActivities(): Promise<Activity[]>`(날짜 최신순, 날짜 없는 것은 끝), `getNotices()`(고정 먼저, 최신순), `getNotice(id)`
- `createSupabasePublicClient()` 쿠키 없음
- `uploadActivityPhoto(file)`, `removeActivityPhoto(path)`

- [ ] 단위 테스트: `localized('한','', 'en') === '한'`, `localized('한','En','en') === 'En'`, 날짜 스키마 통과 `2026`, `2026-11`, `2026-11-06`, `''`; 거부 `2026-13`, `2026-02-30`; `isUploadedPhoto('/images/activities/a.jpg') === false`; CRLF 본문 길이.
- [ ] 실패 확인, 구현, `pnpm test` 통과, 커밋.

### Task 3: 활동 관리 화면

**Files:** Create `src/app/[locale]/admin/activities/{page,actions}.ts(x)`, `new/page.tsx`, `[id]/page.tsx`, `src/components/board/activity-form.tsx`; Modify `src/components/site/account-menu.tsx`(및 라벨 전달부), `messages/{ko,en}.json`; Test `e2e/auth/board-admin.spec.ts`

- [ ] 화면을 만들기 전 `DESIGN.md`와 `/admin/teams`의 틀을 따른다.
- [ ] e2e: 운영진이 사진과 함께 활동을 만들면 목록에 나온다. 고치고 사진을 바꾸면 이전 파일이 버킷에서 사라진다. 지우면(확인 후) 파일도 사라진다. 기존 활동 삭제가 된다. 회원은 `/admin/activities`에 못 들어간다. 계정 메뉴에 링크가 있다.
- [ ] 구현: 액션은 `requireRole`과 세션 클라이언트, 스키마 오류는 칸별 문구. 쓰기 뒤 두 언어의 `/activities`, `/about` `revalidatePath`.
- [ ] `pnpm e2e:auth e2e/auth/board-admin.spec.ts` 통과, 커밋.

### Task 4: 공지 관리 화면

**Files:** Create `src/app/[locale]/admin/notices/*`, `src/components/board/notice-form.tsx`; Modify 계정 메뉴, messages; Test `e2e/auth/board-admin.spec.ts`

- [ ] e2e: 만들기, 고치기, 고정, 지우기, 회원 거부, 5000자 초과 문구.
- [ ] 구현은 Task 3 방식. 쓰기 뒤 두 언어의 `/notices`, `/notices/[id]` 갱신.
- [ ] 통과, 커밋.

### Task 5: 공개 페이지

**Files:** Create `src/app/[locale]/activities/page.tsx`, `src/app/[locale]/notices/page.tsx`, `src/app/[locale]/notices/[id]/page.tsx`, `src/components/board/activity-card.tsx`; Modify `src/components/site/site-header.tsx`(`getNavItems`), `src/components/stage/timeline.tsx`, `src/lib/content.ts`(`stampState`가 `TimelineEvent`를 받음), `src/app/[locale]/about/page.tsx`, `messages/*`; Test `e2e/auth/board-public.spec.ts`, `e2e/auth-off.spec.ts`

**Interfaces — Produces:** `type TimelineEvent = Pick<Stamp, 'id' | 'date' | 'city' | 'title' | 'status' | 'evidence'>`

- [ ] e2e: 방문자에게 활동 카드(제목, 날짜, 도시, 사진, 설명)와 "예정" 표시, 공지 고정 순서와 상세가 보인다. 영어가 빈 글의 `/en` 화면이 한국어를 보여 준다. `/about` 연혁에 새 활동이 나온다. 없는 공지 id는 404. 빈 목록 문구.
- [ ] 스위치 off e2e: `/ko/activities`, `/ko/notices`, `/en/notices/x`, 관리 주소 404, 메뉴에 없음, `/about` 연혁 15건.
- [ ] 구현: `/about`은 스위치에 따라 `getActivities`와 `getStamps` 중 하나. 메뉴 항목은 `/startups`처럼 스위치를 따른다.
- [ ] 두 설정 e2e 통과, 커밋.

### Task 6: 사진

**Files:** Add 고른 파일 `public/images/activities/*`; Modify `src/content/data/photos.ts`, `src/content/data/stamps.ts`; 마이그레이션 입력값

- [ ] 폴더별 촬영일(EXIF)을 읽어 기존 활동과 맞춘다. 맞지 않으면 쓰지 않는다.
- [ ] 후보를 눈으로 보고 활동마다 한 장 고른다. 단체 사진과 현장 사진 위주, 개인이 도드라지거나 이름표·연락처가 읽히는 사진은 뺀다.
- [ ] 긴 변 2400px 이하로 줄이고 메타데이터를 지운다. 파일에 EXIF가 없는지 확인한다.
- [ ] 대체 텍스트를 쓰고 활동 데이터에 연결, 사진 테스트와 lint 통과, 커밋.

### Task 7: 마무리

- [ ] README와 CONTRIBUTING에 공개 전 체크리스트(운영 DB, 버킷)를 더한다.
- [ ] 전체 검사: lint, typecheck, format, unit, pgTAP, `pnpm e2e:auth`, 스위치 off e2e.
- [ ] RLS·저장소 정책과 브랜치 전체 리뷰.
- [ ] 로컬 화면을 사용자에게 보여 준다. 푸시는 사용자가 말할 때.

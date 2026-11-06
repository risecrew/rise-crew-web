# Phase 2: Team Spaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (the user chose inline execution). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone browse startup teams and read their posts, let team members edit their own team page and post with a chosen visibility, and let operators create teams, assign members and hide posts.

**Architecture:** Three tables and two storage buckets on the existing Supabase project, authorized by RLS and guard triggers so that a direct Data API call gets the same answers as the site. Pages are dynamic Server Components that read and write as the visitor, never with the secret key. Photos upload straight from the browser to Storage, because they do not fit through a server action.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, next-intl, zod, `@supabase/ssr`, Supabase Postgres and Storage, pgTAP, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-phase2-team-spaces-design.md` (Korean). Also read `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`. Before any SQL load `supabase` and `supabase-postgres-best-practices`. Before route code read the relevant guide in `node_modules/next/dist/docs/`.

**Rulings against the spec's wording** (same behavior, simpler shape):

- Team links are a `jsonb` column on `teams`, not a table, so saving the intro form is one atomic write.
- Post photos are a `text[]` column on `team_posts`, not a table. The order is the array order.
- Upload limits are checked in the browser and enforced by the bucket settings, not in a server action: Vercel functions refuse bodies over about 4.5MB, and the bucket is the server-side check that a direct call cannot skip.

## Global Constraints

- Branch `phase2-accounts`. One PR at the end. Never push to `main`. Merge only when the user says so.
- Switch: with `isAuthEnabled()` false, every route here is a 404 and the menu has no 창업팀 item.
- Existing public pages stay static: no cookies or headers in them or in the root layout.
- Limits, exactly: name 50, tagline 80, intro 2,000, post title 100, post body 5,000, links 5, photos 4 per post, photo 5MB, logo 2MB. Types: `image/jpeg`, `image/png`, `image/webp`. Page size 10.
- Link kinds: `homepage`, `instagram`, `linkedin`, `other`. URLs must start with `http://` or `https://`.
- Visibility values: `public` (완전 공개), `signed_in` (가입자만). Default `public`.
- Author shows as the team name only. No profile field reaches a team page. `team_members` is never shown on a public page.
- Post bodies are plain text: no HTML, no markdown, no `dangerouslySetInnerHTML`.
- User content is stored and shown as typed in both locales. UI text lives in `messages/ko.json` and `messages/en.json`.
- Every table has RLS on. Grant exactly what each role needs. Never use the secret key in this feature.
- Images use `next/image` with `unoptimized`, so a signed URL never lands in Vercel's image cache.
- Test data uses fake values on `example.test`. Keep security weaknesses out of commit messages, PR text and issues.
- Commits: conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit by exact paths; the untracked photo folder stays out.

## Review Focus

1. A team member calling the Data API directly with a `javascript:` link, or setting `is_published`, `hidden_at` or `author_id`, is refused by the database. (Task 1)
2. A post changed from `public` to `signed_in` disappears for signed-out visitors on the next read, photos included. Signed URLs already issued last at most 10 minutes. (Tasks 2, 5)
3. The third of four photos fails to upload: no post is created, the uploaded files are removed, and the form keeps the text. (Task 5)
4. A member demoted, blocked or removed from the team while the edit page is open is refused on save with a message, and nothing is written. (Task 5)
5. Malformed input in the address (`?field=zzz`, `?cohort=abc`, `?page=-1`, a post id that is not a UUID) is ignored or a 404, never a 500. (Tasks 3, 4)

---

### Task 1: Team tables, RLS and guards

**Files:**
- Create: `supabase/migrations/20261105100000_team_spaces.sql`, `supabase/tests/database/team_spaces.test.sql`
- Modify: `src/lib/supabase/database.types.ts` (generated with `pnpm db:types`)

**Interfaces:**
- Produces tables:
  - `teams(id uuid pk, slug text unique, name, field text, cohort int, tagline text, intro text, logo_path text, links jsonb default '[]', is_published bool default false, created_at, updated_at)`
  - `team_members(team_id, user_id, created_at, pk(team_id, user_id))`, with an index on `user_id`
  - `team_posts(id uuid pk default gen_random_uuid(), team_id, author_id uuid null references auth.users on delete set null, title, body, visibility team_post_visibility default 'public', photo_paths text[] default '{}', hidden_at timestamptz, created_at, updated_at, edited_at timestamptz)`, with an index on `(team_id, created_at desc)`
- Produces functions:
  - `private.is_team_member(team uuid) returns boolean`: signed-in user is in the team and `is_at_least('member')`
  - `private.is_onboarded() returns boolean`: finished sign-up and not blocked
  - `public.team_signed_in_post_count(team uuid) returns integer`: published teams only, not hidden, granted to `anon, authenticated`

- [ ] **Step 1: Write `team_spaces.test.sql`** in the style of `member_list.test.sql`, with fake accounts: outsider guest, unfinished guest, member in team A, member in team B, operator, blocked member of team A. Assert every cell of spec §4's table with `lives_ok`, `throws_ok` or row counts, plus:
  - anon reads a published team, gets nothing from `team_members` and `profiles`
  - anon reads a `public` post, and gets zero rows for a `signed_in`, hidden, or unpublished-team post
  - an unfinished guest and a blocked account get zero `signed_in` posts; a finished guest gets them
  - a team B member cannot update team A or insert, update or delete its posts
  - a team A member cannot change `name`, `slug`, `field`, `cohort`, `is_published`; cannot set `hidden_at`, `team_id` or `author_id`; cannot insert with another `author_id`
  - an operator can set `is_published` and `hidden_at`, can delete a post, cannot edit a post's `title` or `body`, cannot insert a post unless a team member
  - a `javascript:alert(1)` link, a sixth link, a fifth photo path, a 101-character title and a slug with capitals are refused by constraints
  - adding a guest to `team_members` is refused; a member demoted to guest, or removed, loses write access on the next statement
  - `team_signed_in_post_count` returns the number for a published team and 0 for an unpublished one, and exposes nothing else
  - deleting the author's account keeps the post with `author_id` null
  - changing `title` or `body` sets `edited_at`; changing `hidden_at` or `visibility` alone does not

- [ ] **Step 2: Run it to verify it fails.** Run: `pnpm db:test`. Expected: FAIL, `team_spaces` relations do not exist.

- [ ] **Step 3: Write the migration.** Follow `20261027015928_accounts.sql`: revoke all defaults first, then grant on purpose, comment why.
  - Create enum `team_post_visibility`.
  - Constraints: spec §5 lengths; slug `^[a-z0-9]+(-[a-z0-9]+)*$`; `cohort >= 1`; `field ~ '^[a-z0-9-]+$'`; `cardinality(photo_paths) <= 4`; `links` passes `private.valid_team_links(jsonb)`, an immutable function that requires an array of at most 5 objects with a known `kind` and a `url` matching `^https?://` of at most 500 characters.
  - Grants: `select` on `teams` and `team_posts` to `anon, authenticated`; `insert, update` on `teams`, `insert, delete` on `team_members`, `insert, update, delete` on `team_posts` to `authenticated`; `select` on `team_members` to `authenticated`. Nothing for `service_role`.
  - Policies:
    - teams: anon reads `is_published`; authenticated reads `is_published or is_team_member(id) or is_at_least('operator')`; insert for operators; update for team members and operators.
    - team_members: read own row or operators; insert and delete for operators.
    - team_posts read for anon: `visibility = 'public' and hidden_at is null` and the team is published.
    - team_posts read for authenticated: team member, or operator, or (`hidden_at is null`, team published, and `visibility = 'public' or is_onboarded()`).
    - team_posts insert: team member, `author_id = auth.uid()`, `hidden_at is null`. Update: team member or operator. Delete: team member or operator.
  - Guard triggers, because column grants cannot tell a team member from an operator: `private.guard_team_update` (non-operators may change only `tagline, intro, logo_path, links`), `private.guard_team_post_update` (`team_id`, `author_id` never change; `hidden_at` is operators only; `title, body, visibility, photo_paths` are team members only), `private.guard_team_member_insert` (target role is at least `member`), and `private.set_post_edited_at`. Reuse `private.set_updated_at`.

- [ ] **Step 4: Run it to verify it passes.** Run: `pnpm db:reset && pnpm db:test`. Expected: all files pass, including the existing three.

- [ ] **Step 5: Regenerate types and check.** Run: `pnpm db:types && pnpm typecheck`. Expected: no errors.

- [ ] **Step 6: Commit** `feat(db): add teams, team members and team posts with RLS`.

- [ ] **Step 7: Separate review.** Spawn one reviewer on the migration and test against spec §4 and §6, looking for a way to read or write outside the table. Fix what it finds, each fix with a pgTAP test that failed first.

### Task 2: Storage buckets and policies

**Files:**
- Create: `supabase/migrations/20261105100100_team_storage.sql`, `supabase/tests/database/team_storage.test.sql`
- Modify: `.github/workflows/ci.yml:56` and `README.md:54` (remove `storage-api` from the `-x` list), `supabase/config.toml` if the buckets need it

**Interfaces:**
- Produces buckets: `team-logos` (public, 2MB) with path `{team_id}/{uuid}.{ext}`; `team-post-photos` (private, 5MB) with path `{team_id}/{post_id}/{uuid}.{ext}`. Both allow only the three image types.
- Produces: `private.path_uuid(path text, part int) returns uuid`, which returns null on a malformed segment instead of raising.

- [ ] **Step 1: Restart the local stack with Storage.** Run: `pnpm exec supabase stop`, then the `README.md:54` command without `storage-api`. Expected: the `supabase_storage_rise-crew` container is up.

- [ ] **Step 2: Write `team_storage.test.sql`.** Insert `storage.objects` rows as postgres, then read as each role:
  - anon sees the photo of a `public` post, and not of a `signed_in`, hidden, or unpublished-team post
  - after that post changes to `signed_in`, anon sees none of its photos
  - a finished guest sees a `signed_in` post's photo
  - a team member can insert under their own team's path, not under another team's, and not under a malformed path
  - an outsider cannot insert or delete; an operator can delete
  - a logo insert follows the same team rule
  - the bucket rows carry the exact size limits and types

- [ ] **Step 3: Run it to verify it fails.** Run: `pnpm db:test`. Expected: FAIL on the missing buckets.

- [ ] **Step 4: Write the migration.** Insert the buckets into `storage.buckets`. Policies on `storage.objects`:
  - photo read (`anon, authenticated`): an `exists` on `public.team_posts` whose id and team match the path, which applies that table's RLS as the caller, or the caller is a team member of the path's team (so a failed upload can be cleaned up)
  - photo insert: team member of the path's team, and the path has exactly the expected parts
  - photo delete: team member or operator
  - logo insert, update, delete: team member or operator

- [ ] **Step 5: Run it to verify it passes.** Run: `pnpm db:reset && pnpm db:test`. Expected: all pass.

- [ ] **Step 6: Commit** `feat(db): add team storage buckets and policies`. The Task 1 reviewer's pass covers this file too.

### Task 3: Team domain code

**Files:**
- Create: `src/lib/teams/fields.ts`, `src/lib/teams/forms.ts`, `src/lib/teams/text.ts`, `src/lib/teams/query.ts`, `tests/lib/teams-forms.test.ts`, `tests/lib/teams-text.test.ts`, `tests/lib/teams-query.test.ts`

**Interfaces:**
- Produces (no runtime server imports, so the browser can use them):
  - `TEAM_FIELDS: readonly string[]`, `isTeamField(v: unknown): v is TeamField`. Draft values to confirm with the user before the PR: `ai-software`, `mobility`, `healthcare`, `commerce`, `content`, `sustainability`, `other`.
  - `TEAM_LIMITS`, holding the Global Constraints numbers.
  - `teamCreateSchema`, `teamSettingsSchema`, `teamIntroSchema`, `postSchema`: zod schemas matching the DB constraints, with form field errors.
  - `checkPhoto(file: { size: number; type: string }, maxBytes: number): 'ok' | 'tooLarge' | 'badType'`.
  - `isPhotoPathFor(path: string, teamId: string, postId: string): boolean`.
  - `linkify(text: string): Array<{ kind: 'text' | 'link'; value: string }>`.
  - `parseTeamsQuery(params: Record<string, string | string[] | undefined>): { field: TeamField | null; cohort: number | null; page: number }`.
  - `isUuid(v: string): boolean`.

- [ ] **Step 1: Write the failing tests.**
  - `linkify('보세요 https://a.test/x. 끝')` gives a link of `https://a.test/x` (trailing period outside); `javascript:alert(1)` and `www.a.test` stay text; `<b>` stays text.
  - `parseTeamsQuery({ field: 'zzz', cohort: 'abc', page: '-1' })` equals `{ field: null, cohort: null, page: 1 }`; arrays take the first value.
  - `teamIntroSchema` refuses a `javascript:` link, a sixth link and an 81-character tagline; `postSchema` refuses a blank title (spaces only), a 101-character title, a 5,001-character body and an unknown visibility.
  - `checkPhoto({ size: 5 * 1024 * 1024 + 1, type: 'image/png' }, 5 * 1024 * 1024)` is `'tooLarge'`; `image/svg+xml` is `'badType'`.
  - `isPhotoPathFor` refuses another post's prefix and `..` segments.

- [ ] **Step 2: Run to verify they fail.** Run: `pnpm test tests/lib/teams`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the modules** with the signatures above.

- [ ] **Step 4: Run to verify they pass.** Run: `pnpm test tests/lib/teams`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(teams): add team fields, form rules and text helpers`.

### Task 4: Public pages

**Files:**
- Create: `src/lib/teams/queries.ts` (`server-only`), `src/app/[locale]/startups/page.tsx`, `src/app/[locale]/startups/[slug]/page.tsx`, `src/app/[locale]/startups/[slug]/posts/[id]/page.tsx`, `src/components/teams/team-card.tsx`, `src/components/teams/post-body.tsx`, `src/components/teams/post-list.tsx`, `e2e/auth/teams.spec.ts`
- Modify: `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`, `src/lib/metadata.ts` (`UnlistedPath` gains `/startups`), `messages/ko.json`, `messages/en.json`, `e2e/auth-off.spec.ts`, `e2e/auth/helpers.ts`

**Interfaces:**
- Consumes: Task 1 tables and `team_signed_in_post_count`; Task 3 helpers; `getViewer()`.
- Produces in `queries.ts`:
  - `listTeams(q: TeamsQuery): Promise<{ teams: TeamCard[]; cohorts: number[]; total: number }>`
  - `getTeamBySlug(slug: string): Promise<Team | null>`
  - `getTeamAccess(team: Team, viewer: Viewer | null): Promise<{ isMember: boolean; isStaff: boolean }>`
  - `listPosts(teamId: string, page: number): Promise<{ posts: Post[]; total: number; lockedCount: number }>`
  - `getPost(teamId: string, id: string): Promise<Post | null>`
  - `signPhotos(paths: string[]): Promise<string[]>`, 10-minute URLs from the visitor's client
  - `logoUrl(path: string | null): string | null`
- Produces in `site-header.tsx`: `getNavItems()`, which puts `{ href: '/startups', key: 'startups' }` after 소개 only when `isAuthEnabled()`, used by header, mobile nav and footer.
- Produces in `e2e/auth/helpers.ts`: `createTeam(values)`, `addTeamMember(teamId, email)`, `setRole(email, role)`, using the secret key from the test process only.

- [ ] **Step 1: Shape the screens.** Run `impeccable shape` for the list, team page and post page against `DESIGN.md`, and confirm the world it picks matches the other inner pages. Record the result in the task's commit.

- [ ] **Step 2: Write the failing e2e tests** in `e2e/auth/teams.spec.ts` and `e2e/auth-off.spec.ts`:
  - switch off: `/ko/startups`, `/en/startups/x`, `/ko/startups/x/posts/y` are 404, and the menu has no 창업팀 (`e2e/auth-off.spec.ts`)
  - signed out: the list shows only published teams; `?field=` narrows it; `?field=zzz&cohort=abc&page=-1` is 200 with no filter; the empty state shows with no teams
  - signed out on a team page: name, tagline, intro, link and a public post show; the text `가입자 전용 글이 1개 있어요` shows; the signed-in post's title is not in the page source; no profile name or email is in the source
  - signed out: the signed-in post's address is 404; a post id that is not a UUID is 404; an unpublished team's address is 404
  - a finished guest sees the signed-in post and no 글쓰기 button
  - every page in both languages has no console error, no horizontal scroll at phone width and passes `expectAccessible`

- [ ] **Step 3: Run to verify they fail.** Run: `pnpm e2e:auth e2e/auth/teams.spec.ts`. Expected: FAIL with 404 on `/ko/startups`.

- [ ] **Step 4: Implement queries, pages, nav and messages.** Every page starts with `if (!isAuthEnabled()) notFound()`. Reads go through `createSupabaseServerClient`, so RLS decides. A missing or unreadable row is `notFound()`. Check `isUuid` before querying. The sign-in prompt links to `/{locale}/login?next=` with the team page. Copy:
  - `Teams.locked`: `가입자 전용 글이 {count}개 있어요. 로그인하면 볼 수 있어요.` / `{count} posts are for signed-in members. Sign in to read them.`
  - `Teams.visibility.public`: `완전 공개` / `Public`
  - `Teams.visibility.signed_in`: `가입자만` / `Signed-in only`

- [ ] **Step 5: Run to verify they pass.** Run: `pnpm e2e:auth e2e/auth/teams.spec.ts && pnpm e2e e2e/auth-off.spec.ts e2e/seo.spec.ts e2e/navigation.spec.ts`. Expected: PASS, and the sitemap still lists 10 pages.

- [ ] **Step 6: Commit** `feat(teams): add startup list, team and post pages`.

### Task 5: Team editing and posts

**Files:**
- Create: `src/app/[locale]/startups/[slug]/actions.ts`, `src/app/[locale]/startups/[slug]/edit/page.tsx`, `src/app/[locale]/startups/[slug]/posts/new/page.tsx`, `src/app/[locale]/startups/[slug]/posts/[id]/edit/page.tsx`, `src/components/teams/intro-form.tsx`, `src/components/teams/post-form.tsx`, `src/lib/teams/upload.ts`, `e2e/auth/team-posts.spec.ts`
- Modify: `src/app/[locale]/startups/[slug]/page.tsx`, `src/app/[locale]/startups/[slug]/posts/[id]/page.tsx`, messages

**Interfaces:**
- Consumes: Task 2 buckets; Task 3 schemas; Task 4 queries; `requireViewer`.
- Produces in `actions.ts`, all returning `{ ok: false; error: 'denied' | 'invalid' | 'failed'; fields?: Record<string, string> } | null` and redirecting on success:
  - `saveIntro(locale, slug, prev, formData)`
  - `createPost(locale, slug, prev, formData)`, which reads a client-chosen `id` (UUID) and `photoPaths` from the form
  - `updatePost(locale, slug, postId, prev, formData)`
  - `deletePost(locale, slug, postId, prev, formData)`
- Produces in `upload.ts` (browser): `uploadPhotos(teamId, postId, files): Promise<{ paths: string[] } | { error: 'tooLarge' | 'badType' | 'failed' }>`, which removes what it already uploaded when one fails.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/auth/team-posts.spec.ts`:
  - a team member fixes the intro and a link, and the team page shows them
  - a member posts with a photo; a signed-out visitor sees the post and the photo loads with status 200
  - the visibility pills start on 완전 공개; changing to 가입자만 removes the post for a signed-out visitor, and the photo's storage request refuses a new signed URL
  - plain-text body: `<script>` shows as text and a link in the body opens
  - editing shows the edited time; deleting removes the post and its files from Storage (checked with the admin client)
  - a member of another team gets 404 on `/edit` and `/posts/new`, and a direct action call writes nothing
  - **failed upload:** with the third request of four routed to fail by `page.route`, no post row exists, the first two files are gone, and the form keeps title and body
  - **lost access:** with the edit page open, the member is demoted, blocked or removed through the admin client, then saves: a refusal message shows and the row is unchanged
  - a 6MB file and an SVG are refused before any upload

- [ ] **Step 2: Run to verify they fail.** Run: `pnpm e2e:auth e2e/auth/team-posts.spec.ts`. Expected: FAIL, no 글쓰기 button.

- [ ] **Step 3: Implement.**
  - Pages use `requireViewer(locale, next)`, then `getTeamAccess`; without access `notFound()`.
  - Actions re-read the viewer, validate with zod and write with the visitor's client. A write that returns zero rows or a permission error comes back as `denied`.
  - `createPost` and `updatePost` refuse any path where `isPhotoPathFor` is false. On deletes they remove files only after the row change succeeds.
  - `post-form.tsx` flow: pick an id with `crypto.randomUUID()`, run `uploadPhotos` on submit, then call the action with the paths; if the action fails, remove the new files.
  - Near the photo field, show `Teams.photoNotice`: `사진 속 인물과 글에 적은 개인정보는 올린 사람이 확인해 주세요.` / `Please check the people in your photos and any personal details in your post before you share them.`
  - Follow the Pill Radios, Form Fields and Notices rules in `DESIGN.md`; run the `mobile-native` checks on the forms.

- [ ] **Step 4: Run to verify they pass.** Run: `pnpm e2e:auth e2e/auth/team-posts.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(teams): let team members edit their page and post`.

### Task 6: Operator team management

**Files:**
- Create: `src/app/[locale]/admin/teams/page.tsx`, `src/app/[locale]/admin/teams/new/page.tsx`, `src/app/[locale]/admin/teams/[id]/page.tsx`, `src/app/[locale]/admin/teams/actions.ts`, `e2e/auth/team-admin.spec.ts`
- Modify: `src/app/[locale]/admin/members/page.tsx` (link between 회원 and 팀), `src/app/[locale]/startups/[slug]/posts/[id]/page.tsx` (숨기기·되돌리기 for staff), messages

**Interfaces:**
- Consumes: `requireRole(locale, 'operator', next)`; `teamCreateSchema`, `teamSettingsSchema`; `member_list` for picking people by name or email.
- Produces in `actions.ts`: `createTeam`, `updateTeamSettings`, `addTeamMember`, `removeTeamMember`, `setPostHidden(locale, postId, hidden, prev, formData)`, returning the Task 5 result shape.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/auth/team-admin.spec.ts`:
  - an operator creates a team, which is not on the list until 공개 is on
  - a duplicate slug shows a field error, not a crash
  - adding a guest shows `먼저 회원으로 바꿔 주세요` and adds nobody; adding a member lets them post; removing them makes `/posts/new` a 404
  - an operator hides a post: it disappears for visitors, the team and staff still see it labelled 숨김, and 되돌리기 restores it
  - the hidden-post list on the team's admin page shows it
  - an operator deletes a post from its page through Task 5's `deletePost`, which allows staff, and sees no edit button
  - a member and a guest get 404 on `/admin/teams`
  - with accounts on, the team admin screens are `noindex`

- [ ] **Step 2: Run to verify they fail.** Run: `pnpm e2e:auth e2e/auth/team-admin.spec.ts`. Expected: FAIL with 404 on `/ko/admin/teams`.

- [ ] **Step 3: Implement,** following the members screen's frame (`AccountLayout`, `accountMetadata`, its button and field classes). No secret key: writes use the visitor's client. Before the guest refusal, read the target's role through `member_list`, and treat the database trigger's refusal the same way.

- [ ] **Step 4: Run to verify they pass.** Run: `pnpm e2e:auth e2e/auth/team-admin.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(teams): let operators manage teams and hide posts`.

### Task 7: Account deletion, docs and preview

**Files:**
- Modify: `e2e/auth/me.spec.ts`, `README.md`, `CONTRIBUTING.md`, `docs/superpowers/specs/2026-10-26-phase2-accounts-and-roles-design.md` (§2 order, pointing to this spec)

- [ ] **Step 1: Write the failing e2e test** in `e2e/auth/me.spec.ts`: a team member who wrote a post deletes their account; the post stays under the team name with `author_id` null, and the team page still renders. If it passes on first run, the Task 1 foreign key already did the work: keep it as the pin and note that in the commit.

- [ ] **Step 2: Update docs.**
  - `README.md` launch checklist: before the switch goes on, edit the privacy draft per spec §8 and get it approved again, add `/startups` to the sitemap when the site is indexed, and enter teams on the production project.
  - `CONTRIBUTING.md`: how operators create a team and add members, and that the two buckets come from migrations.

- [ ] **Step 3: Confirm the field list with the user.** Ask once for the real 분야 list from Task 3's draft and change `TEAM_FIELDS` if needed.

- [ ] **Step 4: Run everything.** Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm e2e && pnpm e2e:auth`. Expected: all pass.

- [ ] **Step 5: Commit** `docs(teams): add launch steps and the operator guide`.

- [ ] **Step 6: Apply to the dev project, after asking the user.** Show the output of `pnpm exec supabase db push --dry-run`, get a yes, then push. Production is not touched. Then check the Preview on the phone and desktop widths: list, team page, posting with a photo.

### Task 8: Final review and PR

- [ ] **Step 1: Whole-branch review** with one reviewer on the most capable model, per `superpowers:executing-plans`. Fix Critical and Important findings, each with a test that failed first. Check `accounts-security-followups` in memory against the current code, and raise with the user any that this work touched, in chat only.

- [ ] **Step 2: Run `/security-review`.** Permissions changed, so `CLAUDE.md` requires it before merge. Fix what it confirms.

- [ ] **Step 3: Push and open the PR,** titled `팀 공간: 창업팀 목록, 팀 페이지, 팀 게시글`, body in Korean ending with the Claude Code attribution line. Bind it with the `ccd_pr` tools, report CI, offer Auto-fix, and wait for the user's merge instruction.

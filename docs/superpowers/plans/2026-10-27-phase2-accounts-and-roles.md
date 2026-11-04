# Phase 2-1: Accounts, Sign-in and Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone sign up and sign in with Google or an email link, give every account one of four roles (guest, member, operator, admin), and let operators and admins manage members, all behind a build-time switch that stays off until the privacy policy is approved.

**Architecture:** Supabase Auth with `@supabase/ssr` on the existing Next.js 16 App Router site. Session refresh runs in `src/proxy.ts` next to next-intl. Public pages stay statically generated: the header's sign-in state is a client component that reads the session in the browser; only the new account routes render per request. Roles live in a database table that only the server's secret key can write; RLS reads that table (not just the token), so blocking and demotion take effect at once. The schema, RLS and its tests live in `supabase/` as migrations and pgTAP tests, run against a local Supabase stack (CLI + Docker) in development and CI.

**Tech Stack:** Next.js 16.4, React 19, TypeScript strict, Tailwind CSS 4, next-intl 4.14, zod 4.6, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, Supabase CLI 2.122.0 (dev dependency `supabase`), pgTAP via `supabase test db`, Vitest, Playwright, Mailpit (bundled with the local stack).

**Spec:** `docs/superpowers/specs/2026-10-26-phase2-accounts-and-roles-design.md` (Korean). Also read `CLAUDE.md`, `DESIGN.md`, and before any SQL the skills `supabase` and `supabase-postgres-best-practices`.

## Global Constraints

- Work on branch `phase2-accounts`. One PR at the end (Task 12). Never push to `main`.
- Roles, exactly: `guest` (가입자), `member` (회원), `operator` (운영진), `admin` (관리자). Everyone starts as `guest`.
- Operators may change roles only between `guest` and `member`. Only admins assign or remove `operator` and `admin`. Operators may block guests and members; admins may block anyone except themselves.
- Sign-up fields (spec §6): email (from the login account, not typed), last name, first name, occupation (one of: 대학생/Undergraduate, 대학원생/Graduate student, 졸업생·직장인/Alumni or employed, 창업자/Founder, 기타/Other), school and major (required for the two student options), affiliation (optional, shown for the others), required "만 14세 이상 / I am 14 or older", required privacy consent, optional recruitment-email consent. **No phone number, no student ID.**
- Never use `user_metadata` for authorization. Never expose the secret key: the env var is `SUPABASE_SECRET_KEY`, read only in files that `import 'server-only'`.
- Every table has RLS enabled. New tables are not auto-exposed: grant exactly what each role needs.
- The switch is `NEXT_PUBLIC_AUTH_ENABLED`. Unless it is the string `true` and the Supabase URL and publishable key are set, the site behaves exactly like phase 1: no sign-in link, account routes return 404, the proxy does no Supabase work, and the build needs no Supabase env vars.
- Env var names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_AUTH_ENABLED`, `NEXT_PUBLIC_SITE_URL` (existing).
- Public pages (`/`, about, network, contact, join) stay static: do not read cookies or headers in them or in the root layout.
- Account routes (`login`, `welcome`, `me`, `admin/members`) are `noindex`.
- All UI text in Korean and English (`messages/ko.json`, `messages/en.json`). User-entered values are stored as typed and never translated.
- Account screens follow `DESIGN.md`: stage background `#07090f` with a cobalt light from the top (radial, like the 404 page but from above), white text, lime pill for the primary action. Before any UI edit read `.claude/skills/impeccable/reference/craft-floor.md`. No new concept round: the user already chose the layouts (spec §7).
- No member-list export (CSV or otherwise).
- Privacy policy officer text, exactly: "개인정보 보호책임자: RISE CREW 회장 (risecrew4@gmail.com)" and "개인정보 처리 담당: 웹사이트 관리자"; English: "Privacy officer: RISE CREW President (risecrew4@gmail.com)", "Data handling: Website administrator". Policy version constant `PRIVACY_POLICY_VERSION = '2026-10-27'`.
- Pin new dependency versions exactly and commit the lockfile.
- Commit messages: conventional commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Plan decision (deviation from spec §9, recorded in the spec in Task 12):** the spec says the role goes into the token and RLS uses it. RLS here reads the `user_roles` table through a private helper instead, and the token hook adds the role only for display. Reason: the spec also requires that blocking takes effect immediately and that demoted operators lose access; a token claim stays valid until the token expires (up to an hour). Cost: one indexed lookup per statement.

## Review Focus

1. A crafted `next` parameter (`//evil.example`, `https://evil.example`, `/\evil`, `javascript:`) on login, callback or confirm must land on the site, never elsewhere. Pinned by `safeNext` unit tests (Task 3).
2. A user calling the Data API directly with the publishable key and their own token tries to change their role, their email, another person's profile, or to read the member list as a guest. All refused. Pinned by pgTAP tests (Task 2).
3. A blocked account, or an operator demoted while their token is still valid, tries to open `admin/members` or run a member action. Refused immediately. Pinned by the `requireRole` unit tests (Task 3) and the pgTAP "blocked/demoted" tests (Task 2).
4. A new account skips the sign-up form by typing `/ko/me` or `/ko/admin/members` directly. Redirected to `/ko/welcome` until the form is done. Pinned in `e2e/auth/onboarding.spec.ts` (Task 6).
5. An expired, reused or malformed email link, or a Google sign-in the user cancels. The user sees the login page with a clear message and can try again; no crash, no 500. Pinned in `e2e/auth/login.spec.ts` (Task 5).

---

## File Structure

```
supabase/
  config.toml                       local stack: auth hook, redirect URLs, email template, Google (disabled locally)
  migrations/<timestamp>_accounts.sql   types, tables, triggers, grants, RLS, helpers, token hook
  tests/database/accounts.test.sql  pgTAP: RLS, grants, triggers, hook
  templates/magic_link.html         bilingual sign-in email
  seed.sql                          fake local accounts only
src/lib/auth/
  config.ts        isAuthEnabled(env)
  roles.ts         AppRole, ROLE_ORDER, atLeast, canChangeRole, canBlock
  profile.ts       Occupation, profileSchema (zod), PRIVACY_POLICY_VERSION, displayName, initial
  redirect.ts      safeNext(next, locale)
  viewer.ts        getViewer(), requireViewer(), requireRole()   (server-only)
src/lib/supabase/
  server.ts        createSupabaseServerClient()     (server-only)
  browser.ts       createSupabaseBrowserClient()
  admin.ts         createSupabaseAdminClient()      (server-only, secret key)
  proxy.ts         refreshSession(request, response)
  database.types.ts  generated by `pnpm db:types`
src/app/[locale]/
  login/page.tsx, login/login-form.tsx
  welcome/page.tsx, welcome/profile-form.tsx, welcome/actions.ts
  me/page.tsx, me/actions.ts
  admin/members/page.tsx, admin/members/members-table.tsx, admin/members/actions.ts
  privacy/page.tsx
  auth/callback/route.ts, auth/confirm/route.ts, auth/signout/route.ts
  account-layout.tsx  (shared stage + cobalt light shell for the account routes)
src/components/site/account-menu.tsx   client: 로그인 link or initial circle menu
e2e/auth/*.spec.ts, e2e/auth/mailpit.ts, playwright.auth.config.ts
```

---

### Task 1: Local Supabase stack and switch

**Files:**
- Modify: `package.json` (dev dep `supabase@2.122.0`; scripts), `.gitignore`, `next.config.ts`
- Create: `supabase/config.toml` (via `pnpm exec supabase init`), `.env.example`, `src/lib/auth/config.ts`
- Test: `tests/lib/auth-config.test.ts`

**Interfaces:**
- Produces: `isAuthEnabled(env?: Record<string, string | undefined>): boolean`; scripts `db:start`, `db:stop`, `db:reset`, `db:test`, `db:types`; `next.config.ts` honours `NEXT_DIST_DIR` (default `.next`) so the auth-on e2e build can live beside the default one.

- [ ] **Step 1: Write the failing test** `tests/lib/auth-config.test.ts`: `isAuthEnabled({})` is false; `isAuthEnabled({ NEXT_PUBLIC_AUTH_ENABLED: 'true' })` is false (no URL/key); with `NEXT_PUBLIC_AUTH_ENABLED: 'true'`, `NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321'`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x'` it is true; `'TRUE'`, `'1'`, `'yes'` are false.
- [ ] **Step 2: Run** `pnpm test tests/lib/auth-config.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `isAuthEnabled` in `src/lib/auth/config.ts`. Because Next inlines `NEXT_PUBLIC_*` only for literal `process.env.X` reads, the default argument must be an object built from literal reads of the three variables, not `process.env` itself.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Add the stack.** `pnpm add -D --save-exact supabase@2.122.0`; `pnpm exec supabase init` (decline the IDE prompts). In `supabase/config.toml` set `project_id = "rise-crew"`, `[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**", "http://127.0.0.1:3000/**", "http://127.0.0.1:3200/**"]`, `[auth.email] enable_confirmations = false`. Scripts: `"db:start": "supabase start"`, `"db:stop": "supabase stop"`, `"db:reset": "supabase db reset"`, `"db:test": "supabase test db"`, `"db:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts && prettier --write src/lib/supabase/database.types.ts"`. `.gitignore`: `supabase/.temp`, `supabase/.branches`, `.next-auth`. `.env.example` lists the five env var names with one comment line each and no values. `next.config.ts`: `distDir: process.env.NEXT_DIST_DIR ?? '.next'`.
- [ ] **Step 6: Verify** `pnpm db:start`. Expected: prints `API URL: http://127.0.0.1:54321`, a `Mailpit URL` on port 54324, and publishable/secret keys. Then `pnpm build` (switch off, no Supabase env) succeeds and `pnpm test` is green.
- [ ] **Step 7: Commit** `chore: local Supabase stack and the auth switch`.

### Task 2: Schema, RLS and the token hook

**Files:**
- Create: `supabase/migrations/<timestamp>_accounts.sql` (via `pnpm exec supabase migration new accounts`), `supabase/tests/database/accounts.test.sql`, `supabase/seed.sql`, `src/lib/supabase/database.types.ts`
- Modify: `supabase/config.toml` (`[auth.hook.custom_access_token] enabled = true`, `uri = "pg-functions://postgres/public/custom_access_token_hook"`)

**Interfaces:**
- Produces (SQL):
  - `type public.app_role as enum ('guest','member','operator','admin')`
  - `type public.occupation as enum ('undergrad','grad','alumni','founder','other')`
  - `public.profiles(id uuid pk → auth.users on delete cascade, email text not null, last_name text, first_name text, occupation public.occupation, school text, major text, affiliation text, recruit_opt_in boolean not null default false, onboarded_at timestamptz, created_at, updated_at)`. Check: once `onboarded_at` is set, names and occupation are non-empty, and `school`/`major` are non-empty when occupation is `undergrad` or `grad`. Text length caps (names 50, school/major/affiliation 100).
  - `public.user_roles(user_id uuid pk → auth.users on delete cascade, role public.app_role not null default 'guest', blocked_at timestamptz, updated_at timestamptz, updated_by uuid)`
  - `public.consents(id bigint identity pk, user_id uuid not null → auth.users on delete cascade, kind text check in ('privacy','age14','recruit'), granted boolean not null, policy_version text not null, created_at timestamptz default now())`, index on `user_id`.
  - Trigger `on auth.users insert` (function in schema `private`, `security definer`, `search_path = ''`) inserting the profile (with the account email) and a `guest` role row.
  - `private.app_role_of(uid uuid) returns public.app_role` (null when blocked) and `private.is_at_least(min public.app_role) returns boolean` for the current user; `security definer`, `search_path = ''`, execute revoked from `public, anon, authenticated` except what policies need.
  - `public.custom_access_token_hook(event jsonb) returns jsonb` adding `app_role` (text) and `blocked` (boolean) claims; executable only by `supabase_auth_admin`, which also gets `select` on `user_roles` and a policy for it.
- Grants and policies:
  - `profiles`: `authenticated` selects own row; operators+ (not blocked) select all; `authenticated` updates own row only on columns `last_name, first_name, occupation, school, major, affiliation, recruit_opt_in, onboarded_at` (column grant + policy with `using` and `with check`). No insert or delete grant.
  - `user_roles`: `authenticated` selects own row; operators+ select all. No write grant to `authenticated` (writes go through the server's secret key).
  - `consents`: `authenticated` inserts rows where `user_id = auth.uid()` and selects own rows.
  - `anon`: nothing on any of the three.

- [ ] **Step 1: Write the failing pgTAP tests** in `supabase/tests/database/accounts.test.sql` (create two or three users with `auth.users` inserts, switch with `set local role authenticated` and `set local request.jwt.claims`). Assert:
  - a new `auth.users` row creates one `profiles` row with the email and one `user_roles` row with `guest`
  - a guest sees exactly one profile (their own); an operator sees all
  - a guest cannot `update public.user_roles` (privilege error) nor `update profiles set email = ...` nor update another user's profile (0 rows)
  - `anon` selects 0 rows / gets a privilege error on all three tables
  - an operator who is blocked (`blocked_at` set) or demoted to `member` sees only their own profile, even with a stale `app_role = operator` claim
  - setting `onboarded_at` without names fails the check; a `grad` without `major` fails
  - a user cannot insert a consent for another user
  - `custom_access_token_hook` returns `claims.app_role = 'operator'` for an operator and `claims.blocked = true` for a blocked user
  - RLS is enabled on all three tables (`tests.rls_enabled` or `pg_class.relrowsecurity`)
- [ ] **Step 2: Run** `pnpm db:test`. Expected: FAIL (relations do not exist).
- [ ] **Step 3: Write the migration** with the objects above. Wrap `auth.uid()` and helpers in `(select ...)` inside policies (skill rule `security-rls-performance`). Index `user_roles(role)`.
- [ ] **Step 4: Run** `pnpm db:reset && pnpm db:test`. Expected: all pgTAP tests pass. Then run the security advisors against the local database (`pnpm exec supabase db advisors --help` for the local flag; CLI ≥ 2.81.3). Expected: no security warnings for these objects.
- [ ] **Step 5: Seed** `supabase/seed.sql` with fake local accounts only (`guest@example.test`, `member@example.test`, `operator@example.test`, `admin@example.test`, all onboarded, made-up names). Generate types: `pnpm db:types`.
- [ ] **Step 6: Commit** `feat(db): accounts schema, roles, RLS and token hook`.

### Task 3: Supabase clients and the auth rules

**Files:**
- Create: `src/lib/supabase/{server,browser,admin,proxy}.ts`, `src/lib/auth/{roles,profile,redirect,viewer}.ts`
- Modify: `package.json` (deps `@supabase/ssr@0.12.7`, `@supabase/supabase-js@2.118.0`, `server-only`)
- Test: `tests/lib/auth-roles.test.ts`, `tests/lib/auth-profile.test.ts`, `tests/lib/auth-redirect.test.ts`, `tests/lib/auth-viewer.test.ts`

**Interfaces:**
- Consumes: `Database` from `src/lib/supabase/database.types.ts` (Task 2).
- Produces:
  - `type AppRole = 'guest' | 'member' | 'operator' | 'admin'`; `ROLE_ORDER: readonly AppRole[]`; `atLeast(role: AppRole, min: AppRole): boolean`; `canChangeRole(actor: AppRole, from: AppRole, to: AppRole): boolean`; `canBlock(actor: AppRole, target: AppRole, self: boolean): boolean`.
  - `type Occupation = 'undergrad' | 'grad' | 'alumni' | 'founder' | 'other'`; `profileSchema` (zod) for the sign-up form; `PRIVACY_POLICY_VERSION = '2026-10-27'`; `displayName(p: {last_name, first_name}, locale): string` (ko: last+first without space, en: first + space + last); `initial(p): string` (first grapheme of the Korean display name, or of the first name in English).
  - `safeNext(next: string | null | undefined, locale: Locale): string`.
  - `type Viewer = { id: string; email: string; role: AppRole; blocked: boolean; onboarded: boolean; profile: ProfileRow }`; `getViewer(): Promise<Viewer | null>` (reads claims with `getClaims()`, then the profile and role from the DB, so role and block state are current); `requireViewer(locale): Promise<Viewer>` (redirects to `/{locale}/login?next=…` when signed out, to `/{locale}/welcome` when not onboarded, signs out and redirects to login with `error=blocked` when blocked); `requireRole(locale, min: AppRole): Promise<Viewer>` (as `requireViewer`, then `notFound()` below `min`).
  - `createSupabaseServerClient()`, `createSupabaseBrowserClient()`, `createSupabaseAdminClient()`; `refreshSession(request: NextRequest, response: NextResponse): Promise<NextResponse>` (writes refreshed cookies and the cache headers `setAll` hands over onto `response`, calls `getClaims()` once).

- [ ] **Step 1: Write the failing tests.**
  - roles: `canChangeRole('operator','guest','member')` true; `('operator','member','guest')` true; `('operator','member','operator')` false; `('operator','operator','member')` false; `('admin','member','operator')` true; `('admin','admin','member')` true; `('member', *, *)` and `('guest', *, *)` false; same role to same role false. `canBlock('operator','member',false)` true; `('operator','operator',false)` false; `('admin','operator',false)` true; `('admin','admin',true)` false.
  - profile: a valid undergrad passes; a grad without major fails with the major path; an alumni with empty affiliation passes; missing age14 or privacy consent fails; names over 50 chars fail; surrounding whitespace is trimmed; `displayName({last_name:'김',first_name:'라이즈'},'ko')` is `김라이즈`, `'en'` is `라이즈 김`; `initial` of that is `김`.
  - redirect: `safeNext('/ko/me','ko')` → `/ko/me`; `null` → `/ko`; `'//evil.example'`, `'https://evil.example'`, `'/\\evil'`, `'javascript:alert(1)'`, `'/fr/me'`, `'me'` → `/ko`; `'/en/about?x=1#y'` with locale `en` keeps query and hash.
  - viewer: with the Supabase client faked at the module boundary (a stub object with `auth.getClaims` and a `from().select()` chain), `requireRole('ko','operator')` calls `notFound` for a member and for a blocked operator, redirects to `/ko/welcome` for a non-onboarded operator, and returns the viewer for an onboarded, unblocked operator.
- [ ] **Step 2: Run** `pnpm test tests/lib`. Expected: the four new files FAIL (modules not found).
- [ ] **Step 3: Implement** the files. `admin.ts` and `server.ts` and `viewer.ts` start with `import 'server-only'`. `viewer.ts` uses `next/navigation` `redirect`/`notFound`.
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass. `pnpm lint && pnpm typecheck` clean.
- [ ] **Step 5: Commit** `feat(auth): Supabase clients, role rules, profile schema, safe redirects`.

### Task 4: Proxy and auth routes

**Files:**
- Modify: `src/proxy.ts`
- Create: `src/app/[locale]/auth/callback/route.ts`, `src/app/[locale]/auth/confirm/route.ts`, `src/app/[locale]/auth/signout/route.ts`, `playwright.auth.config.ts`, `e2e/auth/mailpit.ts`
- Modify: `package.json` scripts (`e2e:auth`), `playwright.config.ts` (ignore `e2e/auth/**`)

**Interfaces:**
- Consumes: `isAuthEnabled`, `refreshSession`, `createSupabaseServerClient`, `safeNext`, `getViewer`.
- Produces:
  - `GET /{locale}/auth/callback?code&next` exchanges the code, then redirects to `/{locale}/welcome?next=…` if not onboarded, else to `safeNext(next)`; on error to `/{locale}/login?error=link`.
  - `GET /{locale}/auth/confirm?token_hash&type=email&next` verifies the OTP, same redirects.
  - `POST /{locale}/auth/signout` signs out and redirects to `/{locale}`.
  - All three return 404 when the switch is off.
  - `playwright.auth.config.ts`: `testDir: 'e2e/auth'`, port 3200, `webServer.command = 'pnpm build && pnpm start --port 3200'` with env `NEXT_DIST_DIR=.next-auth`, `NEXT_PUBLIC_AUTH_ENABLED=true` and the local URL and keys, which the config reads at load time by running `pnpm exec supabase status -o env` with `execSync` and parsing it (it fails with a clear message if the stack is not running); projects desktop and mobile as in the main config.
  - `e2e/auth/mailpit.ts`: `latestLinkFor(email: string): Promise<string>` polls `http://127.0.0.1:54324/api/v1/messages` and returns the sign-in link from the newest message to that address.
  - Script `"e2e:auth": "playwright test -c playwright.auth.config.ts"`.

- [ ] **Step 1: Write the failing e2e** `e2e/auth/session.spec.ts`: requesting a magic link for `member@example.test` through the Supabase client in the test, opening `latestLinkFor(...)`, lands on `/ko` signed in (the `sb-` auth cookie exists); `POST /ko/auth/signout` clears it; `/ko/auth/confirm?token_hash=bad&type=email` redirects to `/ko/login?error=link`.
- [ ] **Step 2: Run** `pnpm e2e:auth e2e/auth/session.spec.ts`. Expected: FAIL (routes 404).
- [ ] **Step 3: Implement.** `src/proxy.ts`: when `isAuthEnabled()`, run the next-intl middleware, then `refreshSession(request, intlResponse)`; otherwise unchanged. Keep the matcher. Route handlers use `createSupabaseServerClient`.
- [ ] **Step 4: Run** `pnpm e2e:auth e2e/auth/session.spec.ts` and the default `pnpm build && pnpm e2e`. Expected: auth spec passes; the phase 1 suite is still 91 passed / 1 skipped with the switch off.
- [ ] **Step 5: Commit** `feat(auth): session refresh in the proxy and sign-in routes`.

### Task 5: Login page and the header menu

**Files:**
- Create: `src/app/[locale]/account-layout.tsx`, `src/app/[locale]/login/page.tsx`, `src/app/[locale]/login/login-form.tsx`, `src/components/site/account-menu.tsx`, `supabase/templates/magic_link.html`
- Modify: `src/components/site/site-header.tsx`, `src/components/site/mobile-nav.tsx`, `supabase/config.toml` (`[auth.email.template.magic_link] subject = "RISE CREW 로그인 링크 / Sign-in link"`, `content_path = "./supabase/templates/magic_link.html"`), `messages/ko.json`, `messages/en.json` (namespace `Auth`)
- Test: `e2e/auth/login.spec.ts`, `e2e/pages.spec.ts` (switch-off assertions)

**Interfaces:**
- Consumes: `createSupabaseBrowserClient`, `safeNext`, `isAuthEnabled`, `displayName`, `initial`.
- Produces: `AccountLayout({ children })` (stage + top cobalt light shell, `robots: noindex` metadata helper `accountMetadata(title)`); `AccountMenu({ labels })` client component rendering "로그인/Sign in" linking to `/{locale}/login?next=<current path>` when signed out, or the initial circle with a menu (마이페이지/My page, 관리/Admin for operator+ from the `app_role` claim, 로그아웃/Sign out) when signed in. The header renders `AccountMenu` only when `isAuthEnabled()`.

Login page content (spec §7.1): heading "로그인 / Sign in"; line "처음이면 로그인하면서 가입돼요 / New here? Signing in creates your account"; white "구글로 계속하기 / Continue with Google" button (`signInWithOAuth`, `redirectTo` the callback with `next`); "또는 / or"; email field and lime "로그인 링크 받기 / Email me a sign-in link" (`signInWithOtp` with `emailRedirectTo` to the confirm route); after sending, "메일함을 확인해 주세요 / Check your inbox" with the address and a resend button (disabled for 60 seconds). `?error=link` shows "링크가 만료됐거나 이미 사용됐어요. 다시 받아 주세요. / That link has expired or was already used. Request a new one."; `?error=blocked` shows "이용이 제한된 계정이에요. / This account has been suspended."; `?error=oauth` shows "구글 로그인을 마치지 못했어요. 다시 시도해 주세요. / Google sign-in didn't finish. Please try again." Email template: one email with Korean then English lines and the `{{ .SiteURL }}/ko/auth/confirm?token_hash={{ .TokenHash }}&type=email` link.

- [ ] **Step 1: Write the failing e2e.** `e2e/auth/login.spec.ts`: the header shows "로그인"; the login page has the Google button and the email form; submitting an email shows the inbox state; the Mailpit message links to `/ko/auth/confirm`; following it shows the initial circle in the header; `?error=link` shows the expired-link message; an invalid email shows a field error; axe has no serious violations; no horizontal scroll at 390px. `e2e/pages.spec.ts` (switch off): no "로그인" link in the header and `/ko/login` is 404.
- [ ] **Step 2: Run** both configs. Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement** the page, the form (client component), the layout shell, the menu and the email template. Read `craft-floor.md` first.
- [ ] **Step 4: Run** `pnpm e2e:auth` and `pnpm build && pnpm e2e`. Expected: both green. Screenshot `/ko/login` and `/en/login` at 1440 and 390 and check them against spec §7.1 and the mockup choice "A".
- [ ] **Step 5: Commit** `feat(auth): login page and header account menu`.

### Task 6: Sign-up form (welcome)

**Files:**
- Create: `src/app/[locale]/welcome/page.tsx`, `src/app/[locale]/welcome/profile-form.tsx`, `src/app/[locale]/welcome/actions.ts`
- Modify: messages (`Auth.welcome`, `Auth.profile`)
- Test: `e2e/auth/onboarding.spec.ts`

**Interfaces:**
- Consumes: `profileSchema`, `PRIVACY_POLICY_VERSION`, `getViewer`, `safeNext`, `createSupabaseServerClient`.
- Produces: server action `saveProfile(locale: Locale, mode: 'welcome' | 'edit', next: string | null, form: FormData): Promise<{ ok: false; fieldErrors: Record<string, string> } | never>`. It validates with `profileSchema` and updates the own profile. In `welcome` mode it sets `onboarded_at = now()` and inserts three consent rows `privacy`, `age14`, `recruit` with `granted` and `PRIVACY_POLICY_VERSION`; in `edit` mode it keeps `onboarded_at` and inserts a `recruit` row only when the opt-in changed. Then it redirects to `safeNext(next)`. `ProfileForm({ initial?, mode: 'welcome' | 'edit' })` is reused by Task 7.

Form (spec §6/§7.2): heading "반가워요! / Welcome!", line "가입을 마치려면 몇 가지만 알려주세요 / Tell us a few things to finish signing up", email shown read-only with "(로그인 계정 / your sign-in account)", last name and first name side by side, occupation as pill radios, school+major appear for the two student options, affiliation (optional) for the others, three checkboxes: "[필수] 만 14세 이상이에요 / [Required] I am 14 or older", "[필수] 개인정보 수집·이용에 동의해요 (내용 보기) / [Required] I agree to the collection and use of my personal information (read)" linking to the privacy page, "[선택] 모집 소식을 이메일로 받을래요 / [Optional] Email me about recruitment", lime "가입 완료 / Finish sign-up".

- [ ] **Step 1: Write the failing e2e** `e2e/auth/onboarding.spec.ts` with a fresh address per run (`new-<timestamp>@example.test`): after the link, the user lands on `/ko/welcome`; visiting `/ko/me` or `/ko/admin/members` redirects back to `/ko/welcome`; choosing 대학원생 without 전공 shows the field error; choosing 졸업생·직장인 hides 학교/전공 and shows 소속; submitting without the age box is blocked; a valid submit lands on `/ko` with the initial circle; signing in again does not show the form; the consent rows exist (checked through the admin client in the test).
- [ ] **Step 2: Run** `pnpm e2e:auth e2e/auth/onboarding.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the page (redirects to `safeNext(next)` when already onboarded), the client form with progressive enhancement (works as a plain form post), and the action.
- [ ] **Step 4: Run** the spec. Expected: PASS. Screenshot `/ko/welcome` desktop and mobile.
- [ ] **Step 5: Commit** `feat(auth): sign-up profile form with consents`.

### Task 7: My page and account deletion

**Files:**
- Create: `src/app/[locale]/me/page.tsx`, `src/app/[locale]/me/actions.ts`
- Modify: messages (`Auth.me`)
- Test: `e2e/auth/me.spec.ts`

**Interfaces:**
- Consumes: `requireViewer`, `ProfileForm` (mode `edit`), `saveProfile(locale, 'edit', '/{locale}/me', form)`, `createSupabaseAdminClient`, `displayName`, `initial`.
- Produces: server action `deleteAccount(locale: Locale, form: FormData): Promise<never>` that requires the typed confirmation word, deletes the auth user with the admin client (profile, role and consents cascade), signs out and redirects to `/{locale}?deleted=1`.

Page (spec §7.3): initial circle, display name, email, role badge (가입자/Guest, 회원/Member, 운영진/Operator, 관리자/Admin); profile rows; "정보 수정 / Edit" opens the edit form; "로그아웃 / Sign out"; at the bottom "회원 탈퇴 / Delete account" which asks to type "탈퇴" (en: "delete") before the final button. Home shows a one-line notice when `?deleted=1`.

- [ ] **Step 1: Write the failing e2e** `e2e/auth/me.spec.ts`: a signed-in guest sees their data and the 가입자 badge; editing the major saves and shows it; delete without the word is refused; with the word the user is signed out, the auth user and profile are gone (admin client check), and signing in again with the same email starts at `/ko/welcome`.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** it. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): my page with edit and account deletion`.

### Task 8: Member management

**Files:**
- Create: `src/app/[locale]/admin/members/page.tsx`, `src/app/[locale]/admin/members/members-table.tsx`, `src/app/[locale]/admin/members/actions.ts`
- Modify: messages (`Admin.members`)
- Test: `e2e/auth/members.spec.ts`, `tests/lib/auth-roles.test.ts` (if new cases appear)

**Interfaces:**
- Consumes: `requireRole(locale, 'operator')`, `canChangeRole`, `canBlock`, `createSupabaseAdminClient`, `createSupabaseServerClient`.
- Produces: server actions `changeRoles(locale, userIds: string[], to: AppRole)` and `setBlocked(locale, userIds: string[], blocked: boolean)`. Each re-reads the actor with `requireRole`, loads each target's current role from the DB, checks `canChangeRole` / `canBlock` per target, refuses the whole batch if any target is not allowed (returns the names refused), and writes with the admin client (`user_roles.role`, `updated_by`; for blocking also `blocked_at` and an Auth ban via `auth.admin.updateUserById(id, { ban_duration })`, unban with `'none'`).

Page (spec §7.4): heading "회원 관리 / Members"; search by name or email; role filter; "모집 소식 동의만 / Recruitment opt-in only" filter; table columns name, email, occupation, school·major or affiliation, recruitment opt-in, role; row checkboxes; actions "회원으로 / Make member", "가입자로 / Make guest", "차단 / Block", "차단 해제 / Unblock"; for admins only also "운영진으로 / Make operator", "관리자로 / Make admin". 50 rows per page. No export.

- [ ] **Step 1: Write the failing e2e** `e2e/auth/members.spec.ts` (seeded accounts): a guest and a member get 404 at `/ko/admin/members`; an operator sees all seeded people with school/major and opt-in, filters opt-in, promotes a guest to member, cannot see the operator/admin buttons, and a crafted call of `changeRoles(... 'operator')` (posting the action's form with `to=operator`) is refused; an admin promotes a member to operator; blocking a member makes that member's next visit to `/ko/me` land on `/ko/login?error=blocked` and a fresh sign-in attempt fail; the operator demoted by the admin gets 404 on reload with their old token.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm e2e:auth` (all auth specs) and `pnpm db:test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(admin): member management with roles and blocking`.

### Task 9: Privacy policy page

**Files:**
- Create: `src/app/[locale]/privacy/page.tsx`
- Modify: `src/components/site/site-footer.tsx` (link "개인정보 처리방침 / Privacy policy"), messages (`Privacy`), `src/lib/metadata.ts` (`PAGE_PATHS` stays as is: the page is reachable but not in the sitemap until the switch is on)
- Test: `e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `PRIVACY_POLICY_VERSION`.
- Produces: static page `/{locale}/privacy` (available with the switch off too, so it can be reviewed before launch).

Sections, in order (spec §8): purpose of processing; items collected (spec §6 list); retention (until account deletion, deleted immediately on deletion); who processes data for us (Supabase, Vercel, Google sign-in); who can see it (the person; operators and admins for member management and, with consent, recruitment notices); your rights (view, edit, delete on My page); people under 14 cannot sign up; officer lines (Global Constraints); version and effective date `PRIVACY_POLICY_VERSION`. A note at the top in the repo only (not rendered): `// Draft from a standard template; must be approved by operators and the ANCHOR Division before the switch is turned on.`

- [ ] **Step 1: Write the failing test** in `e2e/pages.spec.ts`: `/ko/privacy` and `/en/privacy` return 200, contain the officer line exactly and the version date, pass axe, and the footer links to them.
- [ ] **Step 2: Run** it. Expected: FAIL (404).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm build && pnpm e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: privacy policy page`.

### Task 10: CI with the local stack

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a second job `auth` (needs nothing from `verify`, runs in parallel): checkout, pnpm, Node, `pnpm install --frozen-lockfile`, `supabase/setup-cli@v1` with `version: 2.122.0`, `supabase start`, `pnpm db:test`, `pnpm exec playwright install --with-deps chromium`, `pnpm e2e:auth`. The job uses only the local stack's printed keys; it uses **no repository secrets**.

- [ ] **Step 1: Push the branch** and open the PR as a draft so CI runs. Expected: `verify` green, `auth` green. If `auth` fails only in CI, fix the cause (ports, timing) rather than retrying.
- [ ] **Step 2: Commit** `ci: run database tests and auth e2e against a local Supabase`.

### Task 11: Cloud setup (with the user)

The user does every step that needs an account, a password or a dashboard click (spec §10). Claude gives the exact screens and values and verifies the result. No secret is ever pasted into chat or committed.

- [ ] **Step 1:** User: Google 2-step verification and a Gmail app password on the RISE CREW account; Google Cloud OAuth client (web) with redirect URI `https://<dev-ref>.supabase.co/auth/v1/callback`.
- [ ] **Step 2:** User: in `rise-crew-dev` set Auth → Google (client id/secret), SMTP (smtp.gmail.com, port 465 or 587, the app password, sender `RISE CREW <rise crew gmail>`), email template from `supabase/templates/magic_link.html`, URL configuration (site URL and redirect URLs for Vercel previews `https://rise-crew-web-git-*-rise-crew1.vercel.app/**` and `http://localhost:3000/**`), and enable the Custom Access Token hook.
- [ ] **Step 3:** User runs `pnpm exec supabase login` and `pnpm exec supabase link --project-ref <dev-ref>`, then `pnpm exec supabase db push`. Claude checks with `supabase migration list` that the remote matches.
- [ ] **Step 4:** User sets Vercel **Preview** env vars (`NEXT_PUBLIC_AUTH_ENABLED=true`, URL, publishable key, `SUPABASE_SECRET_KEY`) pointing at `rise-crew-dev`. Production stays untouched (switch off).
- [ ] **Step 5:** User authenticates the Supabase MCP server scoped to `rise-crew-dev` with `read_only=true`. Claude runs the security advisor through it and fixes any finding with a new migration.
- [ ] **Step 6:** Verify on the PR preview URL: Google sign-in and the email link both work end to end; the account appears in the dev dashboard with role `guest`.

### Task 12: Docs, review and merge

**Files:**
- Modify: `README.md` (local Supabase: `pnpm db:start`, `pnpm db:reset`, `pnpm db:test`, `pnpm e2e:auth`; env vars; cloud checklist from Task 11; how to turn the switch on; the "real domain" checklist gains Supabase and Google redirect URLs), `CONTRIBUTING.md` (role handover: how an admin makes the next developer an admin, and removes the old one), `docs/superpowers/specs/2026-10-26-phase2-accounts-and-roles-design.md` (record the RLS plan decision), `DESIGN.md` (account screens: stage with top cobalt light, form fields, pill radios)

- [ ] **Step 1:** Update the docs. Verify `pnpm format:check`.
- [ ] **Step 2:** Run the full gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm build && pnpm e2e && pnpm e2e:auth`. Expected: all green.
- [ ] **Step 3:** Run `/security-review` on the branch and the impeccable finish review on the four account screens; fix Critical/Important findings with a failing test first.
- [ ] **Step 4:** Mark the PR ready. Before merge, with the user: create the production Supabase project (`rise-crew`, Seoul, same security options as dev), repeat Task 11 Steps 1–3 for it, set Vercel **Production** env vars **with `NEXT_PUBLIC_AUTH_ENABLED` unset** (switch stays off until the privacy policy is approved), push migrations to production, then merge when the user says so.
- [ ] **Step 5:** After the privacy policy is approved: the user sets `NEXT_PUBLIC_AUTH_ENABLED=true` in Vercel Production and redeploys; Claude verifies sign-in on the live address.

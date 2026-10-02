# Phase 1: Foundation + Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the RISE CREW website foundation and five bilingual public pages (home, about, network, contact, join) that can replace https://www.iv-lab.com/, with CI, branch protection, and Vercel deployment.

**Architecture:** Next.js 16 App Router with a `[locale]` root segment handled by next-intl (`/ko`, `/en`). Content lives in typed, zod-validated data files behind async accessor functions in `src/lib/content.ts`, so phase 2 can swap the source to Supabase without touching pages. The visual world is the "RISE CREW passport" direction contract; passport primitives (guilloche pattern, data page, stamps, MRZ line, boarding pass) are shared components, and the guilloche pattern is served as a static SVG route.

**Tech Stack:** Next.js 16.3, React 19, TypeScript (strict), Tailwind CSS 4.3, next-intl 4.14, zod 4.6, Vitest 5, Playwright 1.63 + @axe-core/playwright 4.13, ESLint, Prettier, pnpm 12, Node.js 24, Vercel (Hobby).

**Spec:** `docs/superpowers/specs/2026-10-03-phase1-foundation-public-pages-design.md`. Also read `PRODUCT.md`, `CLAUDE.md`, and the home direction contract `.impeccable/surfaces/src-app-locale-page-tsx.md` before starting.

## Global Constraints

- Work on branch `phase1-foundation`, never on `main` directly. Open one PR at Task 13.
- Node.js 24 (`.nvmrc`), pnpm. Run `eval "$(fnm env --shell zsh)"` in a new shell if `node -v` is not v24.
- Locales are exactly `ko` (default) and `en`. Every route lives under `/ko` or `/en`.
- Every user-facing string exists in both Korean and English. No empty strings.
- Brand colors come only from the logo: cobalt `#003e91`, lime `#9fc952`, leaf `#49b67e`, teal `#10a1c7`, sky `#0dbedb`, ocean `#0175ba`. Neutrals: paper `#f4f9f7`, paper-edge `#dbe9e4`, ink `#13203a`, ink-soft `#46546d`. No other hue (for example navy) is used as a main color.
- Text color must meet WCAG AA. Never use lime, leaf, teal, or sky as text on paper or white. Lime is allowed as text only on cobalt.
- "RISE CREW" is the club. "ANCHOR 사업단" ("SKKU ANCHOR Division" in English) is the supporting organization. Never write "RISE 사업단".
- Never invent facts, testimonials, dates, or claims. Only facts from `PRODUCT.md` and the reference folders. Unknown dates stay undated.
- Do not publish officer names or photos, partner logos, or mentor photos unless the data marks consent or approval (the schema enforces this).
- Never commit secrets, personal data, or the reference folders listed in `.gitignore`.
- Do not copy direction-contract text into source code, comments, or rendered output.
- Before any UI edit (Tasks 6 to 11), read `.claude/skills/impeccable/reference/craft-floor.md`. Motion follows the `emil-design-eng` skill: animate only `transform` and `opacity`, ease-out for entrances, respect `prefers-reduced-motion`, never hide content when JavaScript is off.
- Korean text blocks use the Tailwind class `break-keep` (CSS `word-break: keep-all`).
- shadcn/ui is deferred to phase 2. Phase 1 uses native `<details>` for the mobile menu and FAQ (spec deviation, recorded in the spec in Task 0).
- Commit messages: conventional commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. English copy is longer than Korean: on `/en/*` at 390px width, no page may scroll horizontally and no passport field may clip text. Pinned by `expectNoHorizontalScroll` in `e2e/pages.spec.ts` (Task 4), run for every page in the `mobile` project.
2. A visitor whose browser language is neither Korean nor English (for example `ja`) lands on `/ko`, and a visitor with no `Accept-Language` lands on `/ko`. Pinned in `e2e/i18n.spec.ts` (Task 4).
3. Unknown locales and unknown pages (`/fr/about`, `/ko/startups`) return a 404 page, not a crash. Pinned in `e2e/i18n.spec.ts` (Task 4).
4. With JavaScript disabled or `prefers-reduced-motion: reduce`, every stamp is visible (opacity 1) without scrolling tricks. Pinned in `e2e/home.spec.ts` (Task 8).
5. A planned event whose date has already passed must not say "예정 / Upcoming"; it shows "확인 중 / Unconfirmed". And when recruitment is closed, the apply button never points at a dead link; it goes to `/[locale]/join`. Pinned by `stampState` and `applyCta` unit tests (Task 3) and the CTA assertion in `e2e/home.spec.ts` (Task 8).

---

## File Structure

```
.editorconfig, .prettierrc.json, .prettierignore     formatting
eslint.config.mjs, tsconfig.json, next.config.ts     tooling (next.config wraps next-intl plugin)
vitest.config.ts, playwright.config.ts               test runners
messages/ko.json, messages/en.json                   UI strings
scripts/generate-rise-symbol.mjs                     one-off generator for the logo symbol component
src/proxy.ts                                         next-intl locale routing (Next 16 name for middleware)
src/i18n/locales.ts                                  Locale type and list (no framework imports)
src/i18n/as-locale.ts                                string -> Locale or notFound()
src/i18n/routing.ts, navigation.ts, request.ts       next-intl config
src/lib/brand.ts                                     brand hex constants (single source for TS)
src/lib/utils.ts                                     cn()
src/lib/passport.ts                                  pure helpers: guillochePath, toMrz, stampRotation, formatStampDate
src/lib/guilloche.ts                                 guillocheSvg(palette) for the static pattern route
src/lib/content.ts                                   async accessors + pick, stampState, applyCta
src/lib/metadata.ts                                  PAGE_PATHS, localizedAlternates
src/lib/site.ts                                      getSiteUrl
src/lib/fonts.ts                                     web font stylesheet URLs
src/content/schema.ts                                zod schemas and types
src/content/data/*.ts                                stats, stamps, steps, programs, mentors, partners, officers, press, faq, benefits, recruitment
src/app/globals.css                                  Tailwind theme tokens, passport CSS
src/app/[locale]/layout.tsx                          html shell, fonts, header, footer
src/app/[locale]/page.tsx                            home
src/app/[locale]/{about,network,contact,join}/page.tsx
src/app/[locale]/not-found.tsx, [...rest]/page.tsx   404 handling
src/app/[locale]/opengraph-image.tsx                 OG image
src/app/patterns/[name]/route.ts                     static guilloche SVGs (/patterns/blue.svg ...)
src/app/sitemap.ts, src/app/robots.ts                SEO
src/components/brand/rise-symbol.tsx                 generated logo symbol (currentColor)
src/components/passport/*                            Guilloche, DataPage, DataField, labels, MrzLine, Stamp, StampTrail, stamp-labels, BoardingPass, PartnerMark
src/components/site/*                                SiteHeader, SiteFooter, LocaleSwitch, MobileNav, PageCover, SectionHeading
src/components/home/*                                home sections
tests/**/*.test.ts                                   Vitest
e2e/*.spec.ts, e2e/helpers.ts                        Playwright
.github/workflows/ci.yml                             CI
README.md, CONTRIBUTING.md                           docs
```

---

### Task 0: Branch and spec alignment

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-phase1-foundation-public-pages-design.md`

- [ ] **Step 1: Create the work branch**

```bash
cd ~/Desktop/rise-crew
git switch main && git pull --ff-only
git switch -c phase1-foundation
```

- [ ] **Step 2: Record the plan's spec deviations in the spec**

Append this section to the end of the spec file:

```markdown
## 15. 구현 계획에서 확정한 변경

- shadcn/ui 도입은 2단계(관리자 화면)로 미룬다. 1단계의 모바일 메뉴와 FAQ는 브라우저 기본 요소 `<details>`로 만든다. JavaScript 없이도 동작하고 의존성이 줄어든다.
- 길로셰 무늬는 페이지마다 SVG를 반복해서 넣지 않고, `/patterns/{blue,teal,green,white}.svg` 정적 경로로 한 번만 만들어 CSS 배경으로 쓴다.
- 데이터 종류에 `GrowthStep`(5단계 육성 플랜)과 `Benefit`(지원자 혜택)을 추가한다.
- 이름이 공개된 멘토는 기존 사이트 기준 19명이다(7절의 "20명"을 정정).
- 지난 날짜의 예정 일정은 "예정"이 아니라 "확인 중"으로 표시한다.
```

Also replace `기존 사이트 기준 20명` with `기존 사이트 기준 19명` in section 7.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-03-phase1-foundation-public-pages-design.md
git commit -m "docs: record implementation decisions in phase 1 spec

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Scaffold Next.js and tooling

**Files:**
- Create (from generator): `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`, `AGENTS.md`
- Create: `.editorconfig`, `.prettierrc.json`, `.prettierignore`
- Modify: `CLAUDE.md`, `.gitignore`

**Interfaces:**
- Produces: scripts `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test`, `e2e`; path alias `@/*` -> `src/*`.

- [ ] **Step 1: Generate the app in a temp folder**

```bash
eval "$(fnm env --shell zsh)"
rm -rf /tmp/rc-scaffold
cd /tmp && pnpm dlx create-next-app@16.3.8 rc-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --agents-md --yes
ls /tmp/rc-scaffold
```

Expected: a folder with `package.json`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `AGENTS.md`.

- [ ] **Step 2: Copy into the repo without overwriting project docs**

```bash
cd ~/Desktop/rise-crew
rsync -a --exclude node_modules --exclude .git --exclude README.md --exclude .gitignore --exclude CLAUDE.md /tmp/rc-scaffold/ ./
rm -f public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
pnpm install
```

- [ ] **Step 3: Point CLAUDE.md at the generated Next.js agent guide**

Add this line directly under the first heading of `CLAUDE.md`:

```markdown
@AGENTS.md
```

- [ ] **Step 4: Add formatting config**

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

`.prettierignore`:

```
.next
node_modules
pnpm-lock.yaml
public/brand
.claude
.impeccable
playwright-report
test-results
**/*.md
```

```bash
pnpm add -D prettier@3.9.9 prettier-plugin-tailwindcss@0.8.1
```

- [ ] **Step 5: Set package metadata and scripts**

In `package.json` set `"name": "rise-crew-web"`, add `"packageManager": "pnpm@12.8.1"` and `"engines": { "node": ">=24" }`, and make `scripts` exactly:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest run",
  "e2e": "playwright test"
}
```

- [ ] **Step 6: Ignore tool folders in ESLint**

Open `eslint.config.mjs`. Keep the generated imports and config entries, and make the `globalIgnores([...])` array contain exactly:

```js
globalIgnores([
  '.next/**',
  'out/**',
  'build/**',
  'next-env.d.ts',
  '.claude/**',
  '.impeccable/**',
  'playwright-report/**',
  'test-results/**',
]),
```

If the generated file has no `globalIgnores` call, import it with `import { defineConfig, globalIgnores } from 'eslint/config';` and add the call as the last array entry.

- [ ] **Step 7: Confirm `tsconfig.json` is strict**

`compilerOptions.strict` must be `true` (the generator sets it). Add `"tests/**/*.ts"` and `"e2e/**/*.ts"` to `include` if `include` does not already match them through `**/*.ts`.

- [ ] **Step 8: Verify the scaffold builds**

```bash
pnpm format
pnpm lint && pnpm typecheck && pnpm build
```

Expected: all three succeed. `pnpm build` prints the `/` route.

- [ ] **Step 9: Commit**

```bash
git add -A
git status --short   # confirm no reference folders, .env files, or node_modules are staged
git commit -m "chore: scaffold Next.js 16 app with pnpm, prettier, editorconfig

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content schema and validation rules

**Files:**
- Create: `vitest.config.ts`, `src/content/schema.ts`
- Test: `tests/content/schema.test.ts`

**Interfaces:**
- Produces (from `src/content/schema.ts`): schemas `localizedSchema`, `statSchema`, `stampSchema`, `growthStepSchema`, `programSchema`, `mentorSchema`, `partnerSchema`, `officerSchema`, `pressSchema`, `faqSchema`, `benefitSchema`, `recruitmentSchema`; types `Localized`, `Stage`, `Stat`, `Stamp`, `GrowthStep`, `Program`, `Mentor`, `Partner`, `Officer`, `Press`, `Faq`, `Benefit`, `Recruitment`.

- [ ] **Step 1: Install test and schema dependencies**

```bash
pnpm add zod@4.6.5
pnpm add -D vitest@5.0.3 vite-tsconfig-paths@6.1.1
```

`vitest.config.ts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write the failing schema tests**

`tests/content/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  officerSchema,
  partnerSchema,
  recruitmentSchema,
  stampSchema,
  statSchema,
} from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

const baseStamp = {
  id: 'aix',
  date: '2026-01-30',
  city: L('서울', 'Seoul'),
  country: 'KR',
  title: L('대회', 'Contest'),
  stage: 'global',
};

describe('localized text', () => {
  it('rejects a missing English string', () => {
    const r = statSchema.safeParse({
      id: 'members',
      value: '90+',
      label: { ko: '멤버', en: '' },
      basis: L('2026.01 기준', 'As of Jan 2026'),
    });
    expect(r.success).toBe(false);
  });
});

describe('statSchema', () => {
  it('requires a basis', () => {
    const r = statSchema.safeParse({ id: 'members', value: '90+', label: L('멤버', 'Members') });
    expect(r.success).toBe(false);
  });
});

describe('stampSchema', () => {
  it('rejects a done stamp without evidence', () => {
    const r = stampSchema.safeParse({ ...baseStamp, status: 'done', evidence: [] });
    expect(r.success).toBe(false);
  });

  it('accepts a done stamp with evidence', () => {
    const r = stampSchema.safeParse({
      ...baseStamp,
      status: 'done',
      evidence: [{ kind: 'press', label: L('에듀플러스', 'Edu Plus') }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts a planned stamp without evidence', () => {
    const r = stampSchema.safeParse({ ...baseStamp, status: 'planned', evidence: [] });
    expect(r.success).toBe(true);
  });

  it('accepts an undated stamp', () => {
    const r = stampSchema.safeParse({
      ...baseStamp,
      date: undefined,
      status: 'done',
      evidence: [{ kind: 'document', label: L('소개서', 'Brochure') }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed date', () => {
    const r = stampSchema.safeParse({ ...baseStamp, date: '2026/01/30', status: 'planned', evidence: [] });
    expect(r.success).toBe(false);
  });
});

describe('partnerSchema', () => {
  it('rejects a logo that is not approved', () => {
    const r = partnerSchema.safeParse({
      id: 'kakao',
      name: L('카카오모빌리티', 'Kakao Mobility'),
      kind: 'company',
      logo: '/partners/kakao.svg',
      logoApproved: false,
    });
    expect(r.success).toBe(false);
  });

  it('accepts a partner shown as text', () => {
    const r = partnerSchema.safeParse({
      id: 'kakao',
      name: L('카카오모빌리티', 'Kakao Mobility'),
      kind: 'company',
      logoApproved: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('officerSchema', () => {
  it('rejects a name without consent', () => {
    const r = officerSchema.safeParse({
      id: 'president',
      role: L('회장', 'President'),
      name: L('홍길동', 'Hong Gildong'),
      consent: false,
    });
    expect(r.success).toBe(false);
  });

  it('accepts a role-only officer without consent', () => {
    const r = officerSchema.safeParse({ id: 'president', role: L('회장', 'President'), consent: false });
    expect(r.success).toBe(true);
  });
});

describe('recruitmentSchema', () => {
  it('requires an apply URL when open', () => {
    const r = recruitmentSchema.safeParse({ status: 'open', period: L('3월', 'March') });
    expect(r.success).toBe(false);
  });

  it('requires a next notice when closed', () => {
    const r = recruitmentSchema.safeParse({ status: 'closed' });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test tests/content/schema.test.ts`
Expected: FAIL, cannot resolve `@/content/schema`.

- [ ] **Step 4: Implement the schemas**

`src/content/schema.ts`:

```ts
import { z } from 'zod';

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case');
const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'use YYYY, YYYY-MM or YYYY-MM-DD');

export const localizedSchema = z.object({ ko: text, en: text });
export type Localized = z.infer<typeof localizedSchema>;

export const stageSchema = z.enum(['campus', 'domestic', 'global']);
export type Stage = z.infer<typeof stageSchema>;

export const statSchema = z.object({
  id,
  value: text,
  label: localizedSchema,
  basis: localizedSchema,
});
export type Stat = z.infer<typeof statSchema>;

const evidenceSchema = z.object({
  kind: z.enum(['press', 'photo', 'link', 'document']),
  label: localizedSchema,
  url: z.url().optional(),
});

export const stampSchema = z
  .object({
    id,
    date: isoDate.optional(),
    city: localizedSchema,
    country: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2'),
    title: localizedSchema,
    stage: stageSchema,
    status: z.enum(['done', 'planned']),
    evidence: z.array(evidenceSchema),
  })
  .superRefine((stamp, ctx) => {
    if (stamp.status === 'done' && stamp.evidence.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'a done stamp needs evidence' });
    }
  });
export type Stamp = z.infer<typeof stampSchema>;

export const growthStepSchema = z.object({
  id,
  order: z.number().int().min(1),
  name: localizedSchema,
  summary: localizedSchema,
});
export type GrowthStep = z.infer<typeof growthStepSchema>;

export const programSchema = z.object({
  id,
  stage: stageSchema,
  name: localizedSchema,
  summary: localizedSchema,
  details: z.array(localizedSchema),
});
export type Program = z.infer<typeof programSchema>;

export const mentorSchema = z.object({
  id,
  name: localizedSchema,
  org: localizedSchema,
  role: localizedSchema,
  expertise: z.array(localizedSchema).min(1),
  featured: z.boolean(),
  photo: z.string().startsWith('/images/').optional(),
});
export type Mentor = z.infer<typeof mentorSchema>;

export const partnerSchema = z
  .object({
    id,
    name: localizedSchema,
    kind: z.enum(['supporter', 'company', 'university', 'program']),
    url: z.url().optional(),
    logo: z.string().startsWith('/').optional(),
    logoApproved: z.boolean(),
  })
  .superRefine((partner, ctx) => {
    if (partner.logo && !partner.logoApproved) {
      ctx.addIssue({ code: 'custom', path: ['logo'], message: 'logo needs approval' });
    }
  });
export type Partner = z.infer<typeof partnerSchema>;

export const officerSchema = z
  .object({
    id,
    role: localizedSchema,
    name: localizedSchema.optional(),
    photo: z.string().startsWith('/images/').optional(),
    consent: z.boolean(),
  })
  .superRefine((officer, ctx) => {
    if (!officer.consent && (officer.name || officer.photo)) {
      ctx.addIssue({ code: 'custom', path: ['consent'], message: 'name or photo needs consent' });
    }
  });
export type Officer = z.infer<typeof officerSchema>;

export const pressSchema = z.object({
  id,
  outlet: localizedSchema,
  date: isoDate,
  title: text,
  url: z.url().optional(),
});
export type Press = z.infer<typeof pressSchema>;

export const faqSchema = z.object({ id, question: localizedSchema, answer: localizedSchema });
export type Faq = z.infer<typeof faqSchema>;

export const benefitSchema = z.object({ id, title: localizedSchema, body: localizedSchema });
export type Benefit = z.infer<typeof benefitSchema>;

export const recruitmentSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('open'),
    period: localizedSchema,
    applyUrl: z.url(),
    nextNotice: localizedSchema.optional(),
  }),
  z.object({ status: z.literal('closed'), nextNotice: localizedSchema }),
]);
export type Recruitment = z.infer<typeof recruitmentSchema>;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test tests/content/schema.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/content/schema.ts tests/content/schema.test.ts package.json pnpm-lock.yaml
git commit -m "feat: content schemas with evidence, consent and approval rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content data and accessors

**Files:**
- Create: `src/i18n/locales.ts`, `src/content/data/{stats,stamps,steps,programs,mentors,partners,officers,press,faq,benefits,recruitment}.ts`, `src/lib/content.ts`
- Test: `tests/content/data.test.ts`, `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: schemas and types from Task 2.
- Produces (`src/i18n/locales.ts`): `locales`, `type Locale = 'ko' | 'en'`, `defaultLocale`, `isLocale(value: string): value is Locale`.
- Produces (`src/lib/content.ts`): `pick(text: Localized, locale: Locale): string`; `type StampState = 'done' | 'upcoming' | 'unconfirmed'`; `stampState(stamp: Stamp, today: Date): StampState`; `type ApplyCta = { kind: 'apply'; href: string } | { kind: 'notice'; message: Localized }`; `applyCta(r: Recruitment): ApplyCta`; async getters `getStats`, `getStamps` (dated ascending, undated last), `getGrowthSteps` (by order), `getPrograms`, `getMentors` (featured first, otherwise data order), `getPartners`, `getOfficers`, `getPress` (newest first), `getFaqs`, `getBenefits`, `getRecruitment`.

- [ ] **Step 1: Locale module**

`src/i18n/locales.ts`:

```ts
export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Write the failing accessor tests**

`tests/lib/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Stamp } from '@/content/schema';
import { applyCta, getMentors, getPress, getStamps, pick, stampState } from '@/lib/content';

const L = (ko: string, en: string) => ({ ko, en });
const planned = (date?: string): Stamp => ({
  id: 'x',
  date,
  city: L('서울', 'Seoul'),
  country: 'KR',
  title: L('행사', 'Event'),
  stage: 'domestic',
  status: 'planned',
  evidence: [],
});

describe('pick', () => {
  it('returns the string for the locale', () => {
    expect(pick(L('안녕', 'Hello'), 'en')).toBe('Hello');
    expect(pick(L('안녕', 'Hello'), 'ko')).toBe('안녕');
  });
});

describe('stampState', () => {
  const today = new Date('2026-10-03T09:00:00Z');

  it('keeps done stamps done', () => {
    expect(stampState({ ...planned('2026-01-30'), status: 'done', evidence: [{ kind: 'press', label: L('a', 'a') }] }, today)).toBe('done');
  });
  it('marks a future planned stamp as upcoming', () => {
    expect(stampState(planned('2026-12'), today)).toBe('upcoming');
  });
  it('treats the current month as upcoming', () => {
    expect(stampState(planned('2026-10'), today)).toBe('upcoming');
  });
  it('marks a past planned stamp as unconfirmed', () => {
    expect(stampState(planned('2026-07'), today)).toBe('unconfirmed');
    expect(stampState(planned('2026-08-28'), today)).toBe('unconfirmed');
  });
  it('treats an undated planned stamp as upcoming', () => {
    expect(stampState(planned(undefined), today)).toBe('upcoming');
  });
});

describe('applyCta', () => {
  it('links to the form when open', () => {
    expect(applyCta({ status: 'open', period: L('3월', 'March'), applyUrl: 'https://forms.gle/x' })).toEqual({
      kind: 'apply',
      href: 'https://forms.gle/x',
    });
  });
  it('falls back to a notice when closed', () => {
    const notice = L('다음 모집 안내', 'Next intake');
    expect(applyCta({ status: 'closed', nextNotice: notice })).toEqual({ kind: 'notice', message: notice });
  });
});

describe('ordering', () => {
  it('sorts stamps by date with undated stamps last', async () => {
    const stamps = await getStamps();
    const dated = stamps.filter((s) => s.date).map((s) => s.date!);
    expect(dated).toEqual([...dated].sort());
    const firstUndated = stamps.findIndex((s) => !s.date);
    if (firstUndated !== -1) expect(stamps.slice(firstUndated).every((s) => !s.date)).toBe(true);
  });
  it('lists featured mentors first', async () => {
    const mentors = await getMentors();
    const firstNonFeatured = mentors.findIndex((m) => !m.featured);
    expect(mentors.slice(firstNonFeatured).every((m) => !m.featured)).toBe(true);
  });
  it('lists press newest first', async () => {
    const press = await getPress();
    const dates = press.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
```

`tests/content/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as content from '@/lib/content';

const getters = {
  stats: content.getStats,
  stamps: content.getStamps,
  steps: content.getGrowthSteps,
  programs: content.getPrograms,
  mentors: content.getMentors,
  partners: content.getPartners,
  officers: content.getOfficers,
  press: content.getPress,
  faqs: content.getFaqs,
  benefits: content.getBenefits,
};

describe('content data', () => {
  for (const [name, get] of Object.entries(getters)) {
    it(`${name}: ids are unique and the list is not empty`, async () => {
      const items = (await get()) as { id: string }[];
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    });
  }

  it('has the three cover stats', async () => {
    const ids = (await content.getStats()).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['members', 'teams', 'mentors']));
  });

  it('has 19 named mentors and 5 growth steps', async () => {
    expect(await content.getMentors()).toHaveLength(19);
    expect(await content.getGrowthSteps()).toHaveLength(5);
  });

  it('never uses the outdated organization name', async () => {
    const json = JSON.stringify(await Promise.all(Object.values(getters).map((g) => g())));
    expect(json).not.toContain('RISE 사업단');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test tests/lib tests/content/data.test.ts`
Expected: FAIL, cannot resolve `@/lib/content`.

- [ ] **Step 4: Write the data files**

`src/content/data/stats.ts`:

```ts
import type { Stat } from '@/content/schema';

export const stats: Stat[] = [
  { id: 'members', value: '90+', label: { ko: '멤버', en: 'Members' }, basis: { ko: '2026.01 기준', en: 'As of Jan 2026' } },
  { id: 'teams', value: '22+', label: { ko: '창업팀', en: 'Startup teams' }, basis: { ko: '2026.01 기준', en: 'As of Jan 2026' } },
  { id: 'mentors', value: '33', label: { ko: '멘토', en: 'Mentors' }, basis: { ko: '2026.03 2기 OT 기준', en: 'As of the Mar 2026 orientation' } },
];
```

`src/content/data/stamps.ts`:

```ts
import type { Stamp } from '@/content/schema';

const brochure = { kind: 'document', label: { ko: 'RISE CREW 소개서 (2026.10)', en: 'RISE CREW brochure (Oct 2026)' } } as const;
const orientation = { kind: 'document', label: { ko: '2기 오리엔테이션 자료 (2026.03)', en: 'Cohort 2 orientation deck (Mar 2026)' } } as const;
const seoul = { ko: '서울', en: 'Seoul' };

export const stamps: Stamp[] = [
  {
    id: 'cohort-1',
    date: '2025',
    city: seoul,
    country: 'KR',
    title: { ko: 'RISE CREW 1기 출범', en: 'RISE CREW cohort 1 launched' },
    stage: 'campus',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'kakao-mou',
    date: '2025-11-28',
    city: seoul,
    country: 'KR',
    title: { ko: 'ANCHOR 사업단 × 카카오모빌리티 MOU', en: 'ANCHOR Division × Kakao Mobility MOU' },
    stage: 'domestic',
    status: 'done',
    evidence: [{ kind: 'press', label: { ko: '스마트경제 (2025.12.02)', en: 'Smart Economy (Dec 2, 2025)' } }],
  },
  {
    id: 'kakao-workshop',
    city: seoul,
    country: 'KR',
    title: {
      ko: '카카오모빌리티 멘토링 워크숍 · 최우수상 안전상점, 우수상 MORTON·곁은',
      en: 'Kakao Mobility mentoring workshop · Top prize Safety Shop, prizes MORTON and Gyeoteun',
    },
    stage: 'domestic',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'aix-contest',
    date: '2026-01-30',
    city: seoul,
    country: 'KR',
    title: {
      ko: 'AI+X 글로벌 창업경진대회 공동 주최 · 아시아 5개국 15팀 본선',
      en: 'Co-hosted AI+X Global Startup Competition · 15 finalist teams from 5 Asian countries',
    },
    stage: 'global',
    status: 'done',
    evidence: [
      { kind: 'press', label: { ko: '에듀플러스 (2026.01.31)', en: 'Edu Plus (Jan 31, 2026)' } },
      brochure,
    ],
  },
  {
    id: 'cohort-2',
    date: '2026-03-23',
    city: seoul,
    country: 'KR',
    title: { ko: '2기 오리엔테이션', en: 'Cohort 2 orientation' },
    stage: 'campus',
    status: 'done',
    evidence: [orientation],
  },
  {
    id: 'sushi-tech',
    date: '2026-04',
    city: { ko: '도쿄', en: 'Tokyo' },
    country: 'JP',
    title: { ko: 'Sushi Tech Tokyo 2026 참가', en: 'Joined Sushi Tech Tokyo 2026' },
    stage: 'global',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'beyond-expo',
    date: '2026-05',
    city: { ko: '마카오', en: 'Macau' },
    country: 'MO',
    title: { ko: 'BEYOND Expo 2026 참가', en: 'Joined BEYOND Expo 2026' },
    stage: 'global',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'techfest-vietnam',
    city: { ko: '베트남', en: 'Vietnam' },
    country: 'VN',
    title: { ko: 'SKKU × FTU TECHFEST 전시', en: 'SKKU × FTU TECHFEST exhibition' },
    stage: 'global',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'smu-vibe-coding',
    city: { ko: '싱가포르', en: 'Singapore' },
    country: 'SG',
    title: { ko: 'SKKU × SMU 바이브코딩 공동 프로그램', en: 'SKKU × SMU vibe coding joint program' },
    stage: 'global',
    status: 'done',
    evidence: [brochure],
  },
  {
    id: 'london-ir',
    date: '2026-07',
    city: { ko: '런던', en: 'London' },
    country: 'GB',
    title: { ko: '글로벌 IR과 pre-SEED 투자 유치', en: 'Global IR and pre-seed fundraising' },
    stage: 'global',
    status: 'planned',
    evidence: [],
  },
  {
    id: 'roundtable-2',
    date: '2026-08',
    city: seoul,
    country: 'KR',
    title: { ko: '라운드테이블 멘토링 2차 워크숍', en: 'Roundtable mentoring workshop 2' },
    stage: 'domestic',
    status: 'planned',
    evidence: [],
  },
  {
    id: 'kuala-lumpur-ir',
    date: '2026-10',
    city: { ko: '쿠알라룸푸르', en: 'Kuala Lumpur' },
    country: 'MY',
    title: { ko: '글로벌 IR과 SEED 투자 유치', en: 'Global IR and seed fundraising' },
    stage: 'global',
    status: 'planned',
    evidence: [],
  },
  {
    id: 'hangzhou',
    date: '2026-10',
    city: { ko: '항저우', en: 'Hangzhou' },
    country: 'CN',
    title: { ko: '크리에이터 왕홍 프로그램', en: 'Creator (wanghong) program' },
    stage: 'global',
    status: 'planned',
    evidence: [],
  },
  {
    id: 'showcase',
    date: '2026-11',
    city: seoul,
    country: 'KR',
    title: { ko: '창업팀 투자연계 SHOW CASE', en: 'Investor SHOW CASE for startup teams' },
    stage: 'domestic',
    status: 'planned',
    evidence: [],
  },
  {
    id: 'aix-contest-2',
    date: '2026-12',
    city: seoul,
    country: 'KR',
    title: { ko: '제2회 AI+X 글로벌 창업경진대회 결선', en: '2nd AI+X Global Startup Competition final' },
    stage: 'global',
    status: 'planned',
    evidence: [],
  },
];
```

`src/content/data/steps.ts`:

```ts
import type { GrowthStep } from '@/content/schema';

export const steps: GrowthStep[] = [
  { id: 'idea', order: 1, name: { ko: 'Idea & Team Build', en: 'Idea & Team Build' }, summary: { ko: '아이디어를 사업 아이템으로 구체화하고 실행할 창업팀을 꾸립니다.', en: 'Shape the idea into a business and form a team that can execute it.' } },
  { id: 'build', order: 2, name: { ko: 'Build', en: 'Build' }, summary: { ko: '아이디어를 실제로 작동하는 프로토타입(MVP)으로 만듭니다.', en: 'Turn the idea into a working prototype (MVP).' } },
  { id: 'validate', order: 3, name: { ko: 'Validate', en: 'Validate' }, summary: { ko: '실제 고객에게 테스트하고 시장 반응을 데이터로 확인합니다(PMF).', en: 'Test with real customers and confirm market response with data (PMF).' } },
  { id: 'pitch', order: 4, name: { ko: 'Pitch & Funding', en: 'Pitch & Funding' }, summary: { ko: '검증 결과로 투자자를 설득하고 자금을 확보합니다.', en: 'Use validation results to persuade investors and raise funding.' } },
  { id: 'global', order: 5, name: { ko: 'Global', en: 'Global' }, summary: { ko: '국내에서 검증한 모델과 투자금으로 해외 시장에 진출합니다.', en: 'Expand overseas with a model and funding proven at home.' } },
];
```

`src/content/data/programs.ts`:

```ts
import type { Program } from '@/content/schema';

export const programs: Program[] = [
  {
    id: 'vcc',
    stage: 'campus',
    name: { ko: 'VCC (Venture Creation Course)', en: 'VCC (Venture Creation Course)' },
    summary: { ko: '카카오모빌리티와 함께 만든 18회차 실전 창업 교육', en: 'An 18-session venture course co-developed with Kakao Mobility' },
    details: [
      { ko: '기본기 트랙: 재무·회계, MVP 만들기, 기술 트렌드', en: 'Basics track: finance and accounting, building an MVP, tech trends' },
      { ko: 'CEO 트랙: 기업가정신과 리더십', en: 'CEO track: entrepreneurship and leadership' },
      { ko: 'SCALE UP 트랙: 정부지원사업 이해와 성장 전략', en: 'Scale-up track: government programs and growth strategy' },
      { ko: 'VC 트랙: 투자자 관점의 사업성 분석', en: "VC track: business analysis from an investor's view" },
      { ko: '선배 창업가 트랙: 창업 경험과 의사결정 사례', en: 'Founder track: stories and decisions from alumni founders' },
    ],
  },
  {
    id: 'mentoring',
    stage: 'campus',
    name: { ko: '전문 멘토단 1:1 멘토링', en: '1:1 mentoring' },
    summary: { ko: '멘토 33명이 아이디어부터 투자와 해외 진출까지 함께합니다', en: '33 mentors support teams from idea to fundraising and global expansion' },
    details: [],
  },
  {
    id: 'tracks',
    stage: 'campus',
    name: { ko: 'Learner · Preneur 트랙', en: 'Learner and Preneur tracks' },
    summary: { ko: 'SKKU SPEC과 협력하는 두 갈래 과정', en: 'Two tracks run with SKKU SPEC' },
    details: [
      { ko: '러너: 1학기 필수 과정. 5단계 커리큘럼으로 팀 프로젝트를 진행합니다', en: 'Learner: a required first-semester course with a five-step team project curriculum' },
      { ko: '프러너: 러너 수료생과 예비·초기 창업가의 자율 창업 활동과 네트워킹을 지원합니다', en: 'Preneur: self-directed venture work and networking for Learner graduates and early founders' },
    ],
  },
  {
    id: 'seongchangjae',
    stage: 'domestic',
    name: { ko: '성창재', en: 'Seongchangjae' },
    summary: { ko: '우수 창업팀 육성 프로그램. 선발 팀당 사업화 자금 500만 원', en: 'Incubation for selected teams, with KRW 5 million in commercialization funding per team' },
    details: [{ ko: 'BM 수립 → 사업화 검증 → 사업화 지원 → 후속 지원', en: 'Business model → validation → commercialization support → follow-up support' }],
  },
  {
    id: 'funding',
    stage: 'domestic',
    name: { ko: '사업화와 투자 유치', en: 'Commercialization and fundraising' },
    summary: { ko: '법인 설립, 정부지원사업, IR 피칭과 pre-SEED 투자 연계', en: 'Incorporation, government programs, IR pitching and pre-seed investment links' },
    details: [
      { ko: '법인 설립 행정 지원', en: 'Administrative support for incorporation' },
      { ko: '예비창업패키지 등 정부지원사업 공모 지원', en: 'Applications to government startup programs' },
      { ko: 'VC 하우스 입주 프로그램 연계 (마루360, 프론트원)', en: 'Links to VC house programs (MARU360, Front1)' },
    ],
  },
  {
    id: 'global-programs',
    stage: 'global',
    name: { ko: '글로벌 프로그램', en: 'Global programs' },
    summary: { ko: '해외 전시회, 아시아 IR 투어, 해외 대학 공동 프로그램, 해외 특허 지원', en: 'Overseas expos, Asia IR tours, joint programs with universities abroad, and international patent support' },
    details: [],
  },
];
```

`src/content/data/mentors.ts` (English names use Revised Romanization and are listed in `CONTRIBUTING.md` for confirmation):

```ts
import type { Mentor } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
const kakao = L('카카오모빌리티', 'Kakao Mobility');
const anchor = L('성균관대학교 ANCHOR 사업단', 'SKKU ANCHOR Division');
const simsan = L('심산벤처스', 'Simsan Ventures');

export const mentors: Mentor[] = [
  { id: 'ko-kyungsun', featured: true, name: L('고경선', 'Ko Kyungsun'), org: kakao, role: L('이사 · 창업학 박사, 단국대 겸임교수', 'Director · PhD in entrepreneurship, adjunct professor at Dankook University'), expertise: [L('벤처 창업', 'Venture creation'), L('정부지원사업', 'Government startup programs')] },
  { id: 'kim-jongsu', featured: true, name: L('김종수', 'Kim Jongsu'), org: kakao, role: L('사업기획팀장 · 성균관대 박사과정', 'Head of business planning · PhD candidate at SKKU'), expertise: [L('기술사업화', 'Technology commercialization'), L('경영 컨설팅', 'Management consulting'), L('오픈이노베이션', 'Open innovation')] },
  { id: 'park-cheolsu', featured: false, name: L('박철수', 'Park Cheolsu'), org: L('아워박스', 'Ourbox'), role: L('대표 · 시리즈C 스마트물류 스타트업', 'CEO · Series C smart logistics startup'), expertise: [L('SCM', 'SCM'), L('스마트물류', 'Smart logistics'), L('이커머스', 'E-commerce')] },
  { id: 'chae-seungho', featured: false, name: L('채승호', 'Chae Seungho'), org: L('넥스트랜스', 'Nextrans'), role: L('상무 · VC 투자, 해외 투자', 'Managing director · VC and overseas investment'), expertise: [L('초기 투자', 'Early-stage investment'), L('후속 투자', 'Follow-on investment'), L('글로벌 투자(베트남)', 'Global investment (Vietnam)')] },
  { id: 'jung-soonjin', featured: false, name: L('정순진', 'Jung Soonjin'), org: L('경영안전진흥원', 'Business Safety Promotion Institute'), role: L('대표 · 재무·세무 전문가', 'CEO · Finance and tax expert'), expertise: [L('재무', 'Finance'), L('세무', 'Tax')] },
  { id: 'jang-seonghwan', featured: false, name: L('장성환', 'Jang Seonghwan'), org: L('베론글로벌', 'Veron Global'), role: L('대표 · IBM, 구글, 네오위즈, 카카오 출신 투자자', 'CEO · Investor formerly at IBM, Google, Neowiz and Kakao'), expertise: [L('초기 투자', 'Early-stage investment'), L('스케일업', 'Scale-up')] },
  { id: 'shin-dongwon', featured: false, name: L('신동원', 'Shin Dongwon'), org: anchor, role: L('교수 · 전 다음차이나 대표', 'Professor · Former CEO of Daum China'), expertise: [L('초기 투자', 'Early-stage investment'), L('팀 빌딩', 'Team building'), L('글로벌 진출', 'Global expansion')] },
  { id: 'lee-jonghwi', featured: false, name: L('이종휘', 'Lee Jonghwi'), org: L('임팩트앤코', 'Impact&Co'), role: L('대표 · 비즈니스 리서처', 'CEO · Business researcher'), expertise: [L('IR', 'IR'), L('피치덱', 'Pitch decks'), L('스피치', 'Public speaking'), L('정부지원사업', 'Government startup programs')] },
  { id: 'kim-seho', featured: false, name: L('김세호', 'Kim Seho'), org: L('미디어제네레이션', 'Media Generation'), role: L('대표 · 피엠솔루션·인터레스트·아이벤처스 공동창업자', 'CEO · Co-founder of PM Solution, Interest and iVentures'), expertise: [L('정부지원사업 심사', 'Government program review')] },
  { id: 'jung-gyeongjin', featured: false, name: L('정경진', 'Jung Gyeongjin'), org: L('데이터방앗간', 'Data Bangatgan'), role: L('대표 · PM 전문가, 기획자', 'CEO · Product manager and planner'), expertise: [L('MVP', 'MVP'), L('기획', 'Product planning')] },
  { id: 'han-wooduk', featured: false, name: L('한우덕', 'Han Wooduk'), org: L('중앙일보', 'JoongAng Ilbo'), role: L('기자 · 차이나랩 대표', 'Journalist · Head of China Lab'), expertise: [L('중국 대기업·기관 네트워크', 'Network with major Chinese companies and institutions')] },
  { id: 'kim-youngchae', featured: false, name: L('김영채', 'Kim Youngchae'), org: L('KM Solution', 'KM Solution'), role: L('대표 · 포털 출신 미디어 전문가', 'CEO · Media expert from the portal industry'), expertise: [L('리더십', 'Leadership'), L('미디어·콘텐츠', 'Media and content')] },
  { id: 'bae-soongu', featured: false, name: L('배순구', 'Bae Soongu'), org: L('다래전략사업화센터', 'Darae Strategic Commercialization Center'), role: L('대표 · 변리사', 'CEO · Patent attorney'), expertise: [L('엔젤 투자', 'Angel investment'), L('기술사업화', 'Technology commercialization'), L('특허', 'Patents')] },
  { id: 'lee-seunghwa', featured: false, name: L('이승화', 'Lee Seunghwa'), org: simsan, role: L('대표 · 해외 전문 액셀러레이터', 'CEO · Global-focused accelerator'), expertise: [L('해외 진출 액셀러레이팅', 'Global acceleration'), L('시드 투자', 'Seed investment')] },
  { id: 'ha-jiwon', featured: false, name: L('하지원', 'Ha Jiwon'), org: simsan, role: L('이사 · 해외 전문 액셀러레이터', 'Director · Global-focused accelerator'), expertise: [L('해외 진출 액셀러레이팅', 'Global acceleration'), L('시드 투자', 'Seed investment')] },
  { id: 'seol-sanghun', featured: false, name: L('설상훈', 'Seol Sanghun'), org: anchor, role: L('교수 · UI/UX, 제품 디자인 전문가', 'Professor · UI/UX and product design expert'), expertise: [L('프로덕트 핏', 'Product fit'), L('제품 제작', 'Product development')] },
  { id: 'bae-junhak', featured: false, name: L('배준학', 'Bae Junhak'), org: L('오라클인베스트먼트', 'Oracle Investment'), role: L('대표 · 투자 유치, 투자 강의', 'CEO · Fundraising and investment lecturer'), expertise: [L('창업투자론', 'Startup investment'), L('BM 피봇', 'Business model pivots'), L('IR 덱', 'IR decks'), L('글로벌 진출', 'Global expansion')] },
  { id: 'jung-yongjun', featured: false, name: L('정용준', 'Jung Yongjun'), org: anchor, role: L('교수 · 네이버, 카카오 출신 PMF 전문가', 'Professor · PMF expert formerly at Naver and Kakao'), expertise: [L('PMF', 'PMF'), L('BM', 'Business models'), L('서비스 기획', 'Service planning')] },
  { id: 'shin-dongjun', featured: false, name: L('신동준', 'Shin Dongjun'), org: L('(전) EY', 'Formerly EY'), role: L('파트너 · 컨설턴트', 'Partner · Consultant'), expertise: [L('컨설팅', 'Consulting'), L('커리어 관리', 'Career management'), L('창업가 마인드 관리', 'Founder mindset')] },
];
```

`src/content/data/partners.ts`:

```ts
import type { Partner } from '@/content/schema';

export const partners: Partner[] = [
  { id: 'anchor', kind: 'supporter', name: { ko: '성균관대학교 ANCHOR 사업단', en: 'SKKU ANCHOR Division' }, logoApproved: false },
  { id: 'seoul-rise-center', kind: 'supporter', name: { ko: '서울RISE센터', en: 'Seoul RISE Center' }, logoApproved: false },
  { id: 'kakao-mobility', kind: 'company', name: { ko: '카카오모빌리티', en: 'Kakao Mobility' }, logoApproved: false },
  { id: 'darae', kind: 'company', name: { ko: '다래전략사업화센터', en: 'Darae Strategic Commercialization Center' }, logoApproved: false },
  { id: 'smu', kind: 'university', name: { ko: '싱가포르경영대학교(SMU)', en: 'Singapore Management University (SMU)' }, logoApproved: false },
  { id: 'yonsei', kind: 'university', name: { ko: '연세대학교 창업지원단', en: 'Yonsei University Startup Support Center' }, logoApproved: false },
  { id: 'spec', kind: 'program', name: { ko: 'SKKU SPEC', en: 'SKKU SPEC' }, url: 'https://skku-spec.com/', logoApproved: false },
];
```

`src/content/data/officers.ts`:

```ts
import type { Officer } from '@/content/schema';

const role = (id: string, ko: string, en: string): Officer => ({ id, role: { ko, en }, consent: false });

export const officers: Officer[] = [
  role('advisor', '고문', 'Advisor'),
  role('president', '회장', 'President'),
  role('vice-president-1', '부회장', 'Vice president'),
  role('vice-president-2', '부회장', 'Vice president'),
  role('vice-president-3', '부회장', 'Vice president'),
  role('external-relations', '대외협력', 'External relations'),
  role('marketing', '홍보', 'Marketing'),
  role('design', '디자인', 'Design'),
  role('dev-support', '개발지원', 'Development support'),
  role('secretary', '서기', 'Secretary'),
  role('treasurer', '총무', 'Treasurer'),
];
```

`src/content/data/press.ts`:

```ts
import type { Press } from '@/content/schema';

export const press: Press[] = [
  {
    id: 'eduplus-aix',
    outlet: { ko: '에듀플러스', en: 'Edu Plus' },
    date: '2026-01-31',
    title: "아시아 5개국 AI 인재, 혁신 아이디어 격돌… 'AI+X 글로벌 창업경진대회' 개최",
  },
  {
    id: 'smart-economy-mou',
    outlet: { ko: '스마트경제', en: 'Smart Economy' },
    date: '2025-12-02',
    title: '성균관대 앵커사업단, 카카오모빌리티와 미래 모빌리티·AI 창업 생태계 구축 위한 MOU 체결',
  },
];
```

`src/content/data/faq.ts`:

```ts
import type { Faq } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

export const faqs: Faq[] = [
  { id: 'founders-only', question: L('창업자만 지원받나요?', 'Is RISE CREW only for founders?'), answer: L('아니요. 1:1 커리어 컨설팅과 인턴·취업·진학 상담도 함께 제공합니다.', 'No. We also offer 1:1 career consulting and advice on internships, jobs and graduate school.') },
  { id: 'other-schools', question: L('타교생이나 졸업생도 가입할 수 있나요?', 'Can students from other universities or graduates join?'), answer: L('네. 다만 개인 혜택은 수료자에게만 제공됩니다.', 'Yes. Individual benefits are limited to members who complete the program.') },
  { id: 'suwon-campus', question: L('자연과학캠퍼스(수원) 학생도 참여할 수 있나요?', 'Can students at the Natural Sciences Campus (Suwon) join?'), answer: L('네. 글로벌 프로그램은 항공료 지원 조건이 다를 수 있습니다.', 'Yes. Airfare support for global programs may differ.') },
  { id: 'new-teammates', question: L('활동 중에 팀원이 추가되면 함께 가입할 수 있나요?', 'Can new teammates join partway through?'), answer: L('네. 창업팀은 수시로도 모집합니다.', 'Yes. We also accept startup teams on a rolling basis.') },
  { id: 'external-programs', question: L('외부 액셀러레이터 프로그램에 중복 참여해도 되나요?', 'Can we join outside accelerator programs at the same time?'), answer: L('네, 권장합니다.', 'Yes, we encourage it.') },
  { id: 'mentoring', question: L('상시 멘토링을 받을 수 있나요?', 'Can we get mentoring at any time?'), answer: L('호암관 3층의 교수 멘토에게 상시 멘토링을 받을 수 있습니다.', 'Yes. Faculty mentors on the 3rd floor of Hoam Hall offer mentoring throughout the year.') },
];
```

`src/content/data/benefits.ts`:

```ts
import type { Benefit } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

export const benefits: Benefit[] = [
  { id: 'team-building', title: L('아이디어 발굴과 팀 빌딩', 'Ideas and team building'), body: L('다양한 전공의 팀원과 스타트업 팀을 꾸립니다.', 'Form a startup team with members from different majors.') },
  { id: 'mentoring', title: L('전문 멘토링과 정기 세미나', 'Expert mentoring and seminars'), body: L('업계 전문가와 선배 창업가의 멘토링, 최신 트렌드 세미나를 제공합니다.', 'Mentoring from industry experts and alumni founders, plus regular trend seminars.') },
  { id: 'programs', title: L('ANCHOR 사업단 국내외 프로그램 우선 참여', 'Priority access to ANCHOR Division programs'), body: L('사업단이 주관하는 국내외 프로그램에 우선 참여할 수 있습니다.', 'Get priority access to domestic and global programs run by the ANCHOR Division.') },
  { id: 'ir', title: L('사업계획서와 IR 피칭 지원', 'Business plans and IR pitching'), body: L('사업계획서 작성 교육과 투자자 대상 IR 피칭 훈련을 받습니다.', 'Training in writing business plans and pitching to investors.') },
  { id: 'competitions', title: L('국내외 창업경진대회 참가 지원', 'Startup competitions'), body: L('준비 과정부터 출전 비용까지 지원합니다.', 'Support from preparation to entry costs.') },
  { id: 'internships', title: L('스타트업 인턴십', 'Startup internships'), body: L('유망 스타트업에서 인턴으로 일하며 현장 경험과 네트워크를 쌓습니다.', 'Intern at promising startups to gain field experience and a network.') },
  { id: 'government', title: L('정부지원사업 공모 지원', 'Government program applications'), body: L('예비창업패키지 등 정부지원사업 서류 준비와 전략을 전문가와 함께합니다.', 'Prepare applications and strategy for programs such as the Pre-Startup Package with experts.') },
];
```

`src/content/data/recruitment.ts`:

```ts
import type { Recruitment } from '@/content/schema';

export const recruitment: Recruitment = {
  status: 'closed',
  nextNotice: {
    ko: '다음 정기 모집 일정은 확정되면 이 페이지와 이메일로 안내합니다. 창업팀은 수시로도 모집합니다.',
    en: 'We will announce the next intake on this page and by email. Startup teams can also apply on a rolling basis.',
  },
};
```

- [ ] **Step 5: Implement the accessors**

`src/lib/content.ts`:

```ts
import { z } from 'zod';
import { benefits } from '@/content/data/benefits';
import { faqs } from '@/content/data/faq';
import { mentors } from '@/content/data/mentors';
import { officers } from '@/content/data/officers';
import { partners } from '@/content/data/partners';
import { press } from '@/content/data/press';
import { programs } from '@/content/data/programs';
import { recruitment } from '@/content/data/recruitment';
import { stamps } from '@/content/data/stamps';
import { stats } from '@/content/data/stats';
import { steps } from '@/content/data/steps';
import {
  benefitSchema,
  faqSchema,
  growthStepSchema,
  mentorSchema,
  officerSchema,
  partnerSchema,
  pressSchema,
  programSchema,
  recruitmentSchema,
  stampSchema,
  statSchema,
  type Localized,
  type Recruitment,
  type Stamp,
} from '@/content/schema';
import type { Locale } from '@/i18n/locales';

// Parsing at module load makes `next build` fail on invalid data (spec section 6).
const data = {
  stats: z.array(statSchema).parse(stats),
  stamps: z.array(stampSchema).parse(stamps),
  steps: z.array(growthStepSchema).parse(steps),
  programs: z.array(programSchema).parse(programs),
  mentors: z.array(mentorSchema).parse(mentors),
  partners: z.array(partnerSchema).parse(partners),
  officers: z.array(officerSchema).parse(officers),
  press: z.array(pressSchema).parse(press),
  faqs: z.array(faqSchema).parse(faqs),
  benefits: z.array(benefitSchema).parse(benefits),
  recruitment: recruitmentSchema.parse(recruitment),
};

export function pick(text: Localized, locale: Locale): string {
  return text[locale];
}

export type StampState = 'done' | 'upcoming' | 'unconfirmed';

function periodEnd(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  if (day) return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  if (month) return new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
}

export function stampState(stamp: Stamp, today: Date): StampState {
  if (stamp.status === 'done') return 'done';
  if (!stamp.date) return 'upcoming';
  return periodEnd(stamp.date) < today ? 'unconfirmed' : 'upcoming';
}

export type ApplyCta = { kind: 'apply'; href: string } | { kind: 'notice'; message: Localized };

export function applyCta(r: Recruitment): ApplyCta {
  return r.status === 'open' ? { kind: 'apply', href: r.applyUrl } : { kind: 'notice', message: r.nextNotice };
}

function compareStamps(a: Stamp, b: Stamp): number {
  if (a.date && b.date) return a.date.localeCompare(b.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
}

export async function getStats() {
  return data.stats;
}
export async function getStamps() {
  return [...data.stamps].sort(compareStamps);
}
export async function getGrowthSteps() {
  return [...data.steps].sort((a, b) => a.order - b.order);
}
export async function getPrograms() {
  return data.programs;
}
export async function getMentors() {
  return [...data.mentors].sort((a, b) => Number(b.featured) - Number(a.featured));
}
export async function getPartners() {
  return data.partners;
}
export async function getOfficers() {
  return data.officers;
}
export async function getPress() {
  return [...data.press].sort((a, b) => b.date.localeCompare(a.date));
}
export async function getFaqs() {
  return data.faqs;
}
export async function getBenefits() {
  return data.benefits;
}
export async function getRecruitment() {
  return data.recruitment;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS (schema, content, data suites).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales.ts src/content/data src/lib/content.ts tests
git commit -m "feat: phase 1 content data and validated async accessors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Locale routing, messages, page shells, e2e harness

**Files:**
- Create: `src/i18n/{routing,navigation,request,as-locale}.ts`, `src/proxy.ts`, `messages/ko.json`, `messages/en.json`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/{about,network,contact,join}/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/[locale]/[...rest]/page.tsx`, `src/lib/metadata.ts`, `src/lib/site.ts`, `playwright.config.ts`, `e2e/helpers.ts`, `e2e/pages.spec.ts`, `e2e/i18n.spec.ts`
- Modify: `next.config.ts`
- Delete: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `tests/i18n/messages.test.ts`, `tests/lib/metadata.test.ts`

**Interfaces:**
- Consumes: `Locale`, `locales`, `isLocale` (Task 3).
- Produces: `routing`; `Link`, `usePathname`, `useRouter`, `redirect`, `getPathname` from `@/i18n/navigation`; `asLocale(value: string): Locale`; `type PagePath = '' | '/about' | '/network' | '/contact' | '/join'`; `PAGE_PATHS: readonly PagePath[]`; `localizedAlternates(locale: Locale, path: PagePath)`; `getSiteUrl(env?): URL`; e2e helpers `PAGES`, `LOCALES`, `collectConsoleErrors(page)`, `expectAccessible(page)`, `expectNoHorizontalScroll(page)`; message namespaces used by later tasks (full content below).

- [ ] **Step 1: Install next-intl and Playwright**

```bash
pnpm add next-intl@4.14.9
pnpm add -D @playwright/test@1.63.0 @axe-core/playwright@4.13.0
pnpm exec playwright install chromium
```

- [ ] **Step 2: Write the message files**

`messages/ko.json`:

```json
{
  "Meta": {
    "home": { "title": "RISE CREW | 성균관대학교 창업 동아리", "description": "성균관대학교 ANCHOR 사업단 공식 창업 동아리 RISE CREW. 캠퍼스에서 세계로, 실행하는 창업가를 키웁니다." },
    "about": { "title": "소개 | RISE CREW", "description": "RISE CREW의 비전, 육성 플랜, 프로그램, 운영진, 연혁." },
    "network": { "title": "네트워크 | RISE CREW", "description": "RISE CREW와 함께하는 멘토와 협력 기관." },
    "contact": { "title": "문의 | RISE CREW", "description": "RISE CREW 연락처와 제휴 문의." },
    "join": { "title": "지원하기 | RISE CREW", "description": "RISE CREW 모집 안내, 지원 자격, 혜택, 자주 묻는 질문." },
    "notFound": { "title": "페이지를 찾을 수 없습니다 | RISE CREW" }
  },
  "Nav": {
    "primary": "주 메뉴",
    "footer": "사이트 메뉴",
    "home": "홈",
    "about": "소개",
    "network": "네트워크",
    "contact": "문의",
    "join": "지원하기",
    "menu": "메뉴",
    "skip": "본문으로 건너뛰기",
    "switchTo": "English"
  },
  "Footer": {
    "tagline": "캠퍼스에서 세계로.",
    "supportedBy": "성균관대학교 ANCHOR 사업단 공식 창업 동아리",
    "address": "서울 종로구 성균관로 25-2 호암관 50322호",
    "rights": "© {year} RISE CREW"
  },
  "Common": {
    "upcoming": "예정",
    "unconfirmed": "확인 중",
    "dateTbc": "날짜 확인 중",
    "source": "출처 보기",
    "stage": { "campus": "Campus · 교내 역량", "domestic": "Domestic · 국내 사업화", "global": "Global · 해외 진출" }
  },
  "Cta": {
    "apply": "지원하기",
    "notice": "모집 안내 보기",
    "partner": "제휴 문의",
    "passLabel": "BOARDING PASS · 탑승권",
    "route": "FROM SKKU → TO THE WORLD",
    "gate": "GATE"
  },
  "Home": {
    "cover": {
      "issuer": "성균관대학교 · SUNGKYUNKWAN UNIVERSITY",
      "subline": "비전에 도달하고, 아이디어에 불을 붙이며, 영향력을 확장하고, 미래를 끌어올려라!"
    },
    "identity": {
      "kicker": "IDENTITY",
      "title": "학교가 공식으로 지원하는 실행형 창업 동아리",
      "body": "RISE CREW는 성균관대학교 ANCHOR 사업단과 함께하는 공식 창업 동아리입니다. 아이디어에서 멈추지 않고 시장에 나가는 팀을 만듭니다.",
      "affiliation": "성균관대학교 ANCHOR 사업단 공식 창업 동아리",
      "supporter": "성균관대학교 ANCHOR 사업단",
      "mou": "카카오모빌리티 업무협약(MOU) · 2025.11.28 · ANCHOR 사업단 체결"
    },
    "route": {
      "kicker": "ROUTE",
      "title": "캠퍼스에서 세계까지, 세 단계",
      "body": "교내에서 기초를 다지고, 국내에서 사업화를 검증하고, 해외로 확장합니다.",
      "globalNote": "해외 도장은 아래에 모았습니다"
    },
    "global": {
      "kicker": "VISAS",
      "title": "실제로 다녀온 곳에만 도장을 찍습니다",
      "body": "점선 도장은 아직 열리지 않았거나 진행 여부를 확인 중인 일정입니다."
    },
    "network": {
      "kicker": "ENDORSEMENTS",
      "title": "멘토 {count}명이 함께합니다",
      "body": "카카오모빌리티, VC, 액셀러레이터, 교수진의 현직 전문가가 아이디어부터 투자와 해외 진출까지 함께합니다.",
      "partners": "함께하는 기관",
      "cta": "네트워크 전체 보기"
    },
    "press": { "kicker": "PRESS", "title": "언론 보도" },
    "final": {
      "title": "다음 출국편에 탑승하세요",
      "body": "창업팀, 1인 창업자, 팀이 없는 개인 모두 지원할 수 있습니다."
    }
  },
  "About": {
    "kicker": "ABOUT",
    "title": "아이디어를 실행으로, 캠퍼스를 세계로",
    "lead": "RISE CREW는 성균관대학교 ANCHOR 사업단과 함께하는 공식 창업 동아리입니다. 교육, 실습, 글로벌 경험으로 실행력을 갖춘 창업 인재를 키웁니다.",
    "rise": {
      "kicker": "R·I·S·E",
      "title": "이름에 담은 네 가지 약속",
      "r": "Reach · 비전에 도달한다",
      "i": "Ignite · 아이디어에 불을 붙인다",
      "s": "Scale up · 영향력을 확장한다",
      "e": "Elevate · 미래를 끌어올린다",
      "born": "Born to Global: 사업자 등록과 동시에 해외 시장을 겨냥하는 창업을 목표로 합니다."
    },
    "supporter": {
      "kicker": "SUPPORTED BY",
      "title": "성균관대학교 ANCHOR 사업단",
      "body": "ANCHOR 사업단은 RISE CREW를 지원하는 기관입니다. 서울시와 교육부의 RISE(지역혁신중심 대학지원체계) 사업에 참여하는 성균관대학교 사업단으로, 2025년 6월부터 2030년 2월까지 운영됩니다.",
      "kpiFunding": "창업팀 누적 펀딩 유치 24억 원",
      "kpiGlobal": "Born to Global 사업자 등록 창업팀 10개",
      "kpiLabel": "사업단 5개년 목표"
    },
    "steps": { "kicker": "GROWTH PLAN", "title": "5단계 육성 플랜", "body": "VCC 강연, 전문 멘토단 1:1 멘토링, 동아리방이 모든 단계를 받칩니다." },
    "programs": { "kicker": "PROGRAMS", "title": "프로그램" },
    "crew": { "kicker": "CREW", "title": "운영진", "advisor": "지도교수", "pending": "운영진의 이름과 사진은 게시 동의를 받은 뒤 공개합니다." },
    "history": { "kicker": "HISTORY", "title": "연혁" }
  },
  "Network": {
    "kicker": "NETWORK",
    "title": "멘토 {count}명과 협력 기관",
    "lead": "현직 전문가와 기관이 RISE CREW 팀의 성장을 받칩니다.",
    "mentors": { "title": "멘토", "note": "전체 멘토 {total}명 중 이름이 공개된 {listed}명을 소개합니다." },
    "partners": {
      "title": "협력 기관",
      "kind": { "supporter": "지원 기관", "company": "기업", "university": "대학", "program": "협력 프로그램" }
    },
    "mou": {
      "kicker": "MOU",
      "title": "카카오모빌리티 업무협약",
      "date": "2025년 11월 28일 · 성균관대학교 ANCHOR 사업단 체결",
      "crew": "RISE CREW와 성창재 창업팀 멘토링·성장 지원",
      "vcc": "VCC 커리큘럼 공동 개발과 운영",
      "contest": "글로벌 대학생 창업경진대회 공동 기획과 운영"
    }
  },
  "Contact": {
    "kicker": "CONTACT",
    "title": "제휴와 협업을 기다립니다",
    "lead": "기업, 기관, 멘토, 언론 문의는 이메일로 보내주세요.",
    "partnerTitle": "제휴 문의",
    "partnerBody": "메일 제목에 [제휴 문의]가 미리 들어갑니다. 소속, 담당자, 제안 내용을 적어주세요.",
    "partnerSubject": "[제휴 문의] ",
    "room": "호암관 50322호 (동아리방)"
  },
  "Join": {
    "kicker": "JOIN",
    "title": "RISE CREW에 탑승하세요",
    "lead": "창업팀, 1인 창업자, 팀이 없는 개인 모두 지원할 수 있습니다.",
    "status": { "open": "모집 중", "closed": "모집 기간이 아닙니다" },
    "eligibility": {
      "title": "지원 자격",
      "campus": "성균관대학교 인문사회과학캠퍼스와 자연과학캠퍼스 학생",
      "types": "창업팀, 1인 창업자, 팀이 없는 개인",
      "others": "타교생과 졸업생도 가입할 수 있습니다. 개인 혜택은 수료자에게만 제공됩니다."
    },
    "benefits": { "title": "받을 수 있는 것" },
    "faq": { "title": "자주 묻는 질문" }
  },
  "NotFound": {
    "kicker": "404",
    "title": "페이지를 찾을 수 없습니다",
    "body": "주소가 바뀌었거나 아직 열리지 않은 페이지입니다.",
    "home": "홈으로"
  }
}
```

`messages/en.json`:

```json
{
  "Meta": {
    "home": { "title": "RISE CREW | Sungkyunkwan University startup club", "description": "RISE CREW is the official startup club of the SKKU ANCHOR Division. We grow founders who execute, from campus to the world." },
    "about": { "title": "About | RISE CREW", "description": "RISE CREW's vision, growth plan, programs, crew and history." },
    "network": { "title": "Network | RISE CREW", "description": "Mentors and partners who work with RISE CREW." },
    "contact": { "title": "Contact | RISE CREW", "description": "Contact RISE CREW and send partnership inquiries." },
    "join": { "title": "Join | RISE CREW", "description": "RISE CREW recruitment, eligibility, benefits and FAQ." },
    "notFound": { "title": "Page not found | RISE CREW" }
  },
  "Nav": {
    "primary": "Main menu",
    "footer": "Site menu",
    "home": "Home",
    "about": "About",
    "network": "Network",
    "contact": "Contact",
    "join": "Join",
    "menu": "Menu",
    "skip": "Skip to content",
    "switchTo": "한국어"
  },
  "Footer": {
    "tagline": "From campus to the world.",
    "supportedBy": "Official startup club of the SKKU ANCHOR Division",
    "address": "Room 50322, Hoam Hall, 25-2 Sungkyunkwan-ro, Jongno-gu, Seoul",
    "rights": "© {year} RISE CREW"
  },
  "Common": {
    "upcoming": "Upcoming",
    "unconfirmed": "Unconfirmed",
    "dateTbc": "Date TBC",
    "source": "View source",
    "stage": { "campus": "Campus · Build the basics", "domestic": "Domestic · Prove the business", "global": "Global · Go abroad" }
  },
  "Cta": {
    "apply": "Apply",
    "notice": "See recruitment",
    "partner": "Partner with us",
    "passLabel": "BOARDING PASS",
    "route": "FROM SKKU → TO THE WORLD",
    "gate": "GATE"
  },
  "Home": {
    "cover": {
      "issuer": "SUNGKYUNKWAN UNIVERSITY · 성균관대학교",
      "subline": "The official startup club of the SKKU ANCHOR Division."
    },
    "identity": {
      "kicker": "IDENTITY",
      "title": "A university-backed club that builds real ventures",
      "body": "RISE CREW is the official startup club of the SKKU ANCHOR Division. We do not stop at ideas; we build teams that go to market.",
      "affiliation": "Official startup club, SKKU ANCHOR Division",
      "supporter": "SKKU ANCHOR Division",
      "mou": "MOU with Kakao Mobility · Nov 28, 2025 · signed by the ANCHOR Division"
    },
    "route": {
      "kicker": "ROUTE",
      "title": "From campus to the world, in three stages",
      "body": "Build the basics on campus, prove the business at home, then expand abroad.",
      "globalNote": "Overseas stamps are collected below"
    },
    "global": {
      "kicker": "VISAS",
      "title": "We only stamp places we have actually been",
      "body": "Dashed stamps are events that have not happened yet or are still being confirmed."
    },
    "network": {
      "kicker": "ENDORSEMENTS",
      "title": "{count} mentors on board",
      "body": "Experts from Kakao Mobility, venture capital, accelerators and faculty support teams from idea to fundraising and global expansion.",
      "partners": "Partners",
      "cta": "See the full network"
    },
    "press": { "kicker": "PRESS", "title": "In the press" },
    "final": {
      "title": "Board the next departure",
      "body": "Startup teams, solo founders and individuals without a team can all apply."
    }
  },
  "About": {
    "kicker": "ABOUT",
    "title": "Ideas into action, campus into the world",
    "lead": "RISE CREW is the official startup club of the SKKU ANCHOR Division. We grow founders who can execute through education, practice and global experience.",
    "rise": {
      "kicker": "R·I·S·E",
      "title": "Four promises in our name",
      "r": "Reach your vision",
      "i": "Ignite your idea",
      "s": "Scale up your impact",
      "e": "Elevate your future",
      "born": "Born to Global: we aim for ventures that target overseas markets from the day they register."
    },
    "supporter": {
      "kicker": "SUPPORTED BY",
      "title": "SKKU ANCHOR Division",
      "body": "The ANCHOR Division supports RISE CREW. It is Sungkyunkwan University's division in the Seoul RISE (Regional Innovation System & Education) program, running from June 2025 to February 2030.",
      "kpiFunding": "KRW 2.4 billion in cumulative startup funding",
      "kpiGlobal": "10 registered Born to Global startups",
      "kpiLabel": "Division five-year goals"
    },
    "steps": { "kicker": "GROWTH PLAN", "title": "Five-step growth plan", "body": "VCC lectures, 1:1 expert mentoring and a club room support every step." },
    "programs": { "kicker": "PROGRAMS", "title": "Programs" },
    "crew": { "kicker": "CREW", "title": "Crew", "advisor": "Faculty advisor", "pending": "Crew names and photos will be published once each member consents." },
    "history": { "kicker": "HISTORY", "title": "History" }
  },
  "Network": {
    "kicker": "NETWORK",
    "title": "{count} mentors and our partners",
    "lead": "Working experts and institutions back every RISE CREW team.",
    "mentors": { "title": "Mentors", "note": "{listed} of our {total} mentors are listed by name." },
    "partners": {
      "title": "Partners",
      "kind": { "supporter": "Supporter", "company": "Company", "university": "University", "program": "Partner program" }
    },
    "mou": {
      "kicker": "MOU",
      "title": "Partnership with Kakao Mobility",
      "date": "November 28, 2025 · signed by the SKKU ANCHOR Division",
      "crew": "Mentoring and growth support for RISE CREW and Seongchangjae teams",
      "vcc": "Co-developing and running the VCC curriculum",
      "contest": "Co-planning and running a global university startup competition"
    }
  },
  "Contact": {
    "kicker": "CONTACT",
    "title": "Let's work together",
    "lead": "Companies, institutions, mentors and press: please reach us by email.",
    "partnerTitle": "Partnership inquiry",
    "partnerBody": "The subject line starts with [Partnership]. Please include your organization, contact person and proposal.",
    "partnerSubject": "[Partnership] ",
    "room": "Room 50322, Hoam Hall (club room)"
  },
  "Join": {
    "kicker": "JOIN",
    "title": "Board RISE CREW",
    "lead": "Startup teams, solo founders and individuals without a team can all apply.",
    "status": { "open": "Recruiting now", "closed": "Not recruiting right now" },
    "eligibility": {
      "title": "Who can apply",
      "campus": "Students at SKKU's Humanities and Social Sciences Campus and Natural Sciences Campus",
      "types": "Startup teams, solo founders and individuals without a team",
      "others": "Students from other universities and graduates can join. Individual benefits are limited to members who complete the program."
    },
    "benefits": { "title": "What you get" },
    "faq": { "title": "FAQ" }
  },
  "NotFound": {
    "kicker": "404",
    "title": "Page not found",
    "body": "The address may have changed, or the page is not open yet.",
    "home": "Go home"
  }
}
```

- [ ] **Step 3: Write the failing unit tests**

`tests/i18n/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';

function flatten(obj: object, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(acc, flatten(v, key));
    else acc[key] = v;
    return acc;
  }, {});
}

describe('messages', () => {
  const k = flatten(ko);
  const e = flatten(en);

  it('ko and en have the same keys', () => {
    expect(Object.keys(e).sort()).toEqual(Object.keys(k).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries({ ...k, ...e })) {
      expect(typeof value === 'string' && value.trim().length > 0, key).toBe(true);
    }
  });

  it('never uses the outdated organization name', () => {
    expect(JSON.stringify(ko)).not.toContain('RISE 사업단');
  });
});
```

`tests/lib/metadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localizedAlternates, PAGE_PATHS } from '@/lib/metadata';
import { getSiteUrl } from '@/lib/site';

describe('localizedAlternates', () => {
  it('builds canonical and language alternates', () => {
    expect(localizedAlternates('en', '/about')).toEqual({
      canonical: '/en/about',
      languages: { ko: '/ko/about', en: '/en/about', 'x-default': '/ko/about' },
    });
  });
  it('handles the home path', () => {
    expect(localizedAlternates('ko', '').canonical).toBe('/ko');
  });
  it('lists the five public pages', () => {
    expect(PAGE_PATHS).toEqual(['', '/about', '/network', '/contact', '/join']);
  });
});

describe('getSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://risecrew.kr' }).origin).toBe('https://risecrew.kr');
  });
  it('falls back to the Vercel production host', () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'rise-crew-web.vercel.app' }).origin).toBe(
      'https://rise-crew-web.vercel.app',
    );
  });
  it('falls back to localhost', () => {
    expect(getSiteUrl({}).origin).toBe('http://localhost:3000');
  });
});
```

Run: `pnpm test`
Expected: FAIL, cannot resolve `@/lib/metadata` and `@/lib/site`. (`messages.test.ts` passes.)

- [ ] **Step 4: Implement metadata and site helpers**

`src/lib/metadata.ts`:

```ts
import type { Locale } from '@/i18n/locales';

export type PagePath = '' | '/about' | '/network' | '/contact' | '/join';
export const PAGE_PATHS: readonly PagePath[] = ['', '/about', '/network', '/contact', '/join'];

export function localizedAlternates(locale: Locale, path: PagePath) {
  return {
    canonical: `/${locale}${path}`,
    languages: { ko: `/ko${path}`, en: `/en${path}`, 'x-default': `/ko${path}` },
  };
}
```

`src/lib/site.ts`:

```ts
type Env = Record<string, string | undefined>;

export function getSiteUrl(env: Env = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL('http://localhost:3000');
}
```

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: next-intl configuration**

`src/i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from './locales';

export const routing = defineRouting({ locales, defaultLocale, localePrefix: 'always' });
```

`src/i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`src/i18n/request.ts`:

```ts
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

`src/i18n/as-locale.ts`:

```ts
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from './locales';

export function asLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
```

`src/proxy.ts`:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Layout, page shells and 404**

Delete the generated root files:

```bash
git rm src/app/layout.tsx src/app/page.tsx
```

`src/app/[locale]/layout.tsx` (header, footer and fonts are added in Tasks 5 and 7):

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { routing } from '@/i18n/routing';
import { getSiteUrl } from '@/lib/site';
import '../globals.css';

export const metadata: Metadata = { metadataBase: getSiteUrl() };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Each of the five pages starts as a shell with metadata. `src/app/[locale]/about/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.about' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '/about') };
}

export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('About');
  return (
    <main id="main">
      <h1>{t('title')}</h1>
    </main>
  );
}
```

Create the other four the same way, with these values:

| File | `Meta` namespace | path | function name | heading |
|---|---|---|---|---|
| `src/app/[locale]/page.tsx` | `Meta.home` | `''` | `HomePage` | `t('cover.issuer')` with `getTranslations('Home')` |
| `src/app/[locale]/network/page.tsx` | `Meta.network` | `'/network'` | `NetworkPage` | `t('title', { count: 33 })` with `getTranslations('Network')` |
| `src/app/[locale]/contact/page.tsx` | `Meta.contact` | `'/contact'` | `ContactPage` | `t('title')` with `getTranslations('Contact')` |
| `src/app/[locale]/join/page.tsx` | `Meta.join` | `'/join'` | `JoinPage` | `t('title')` with `getTranslations('Join')` |

`src/app/[locale]/[...rest]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';

export default function CatchAllPage() {
  notFound();
}
```

`src/app/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main">
      <p>{t('kicker')}</p>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <Link href="/">{t('home')}</Link>
    </main>
  );
}
```

- [ ] **Step 7: Playwright harness**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ko`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

`e2e/helpers.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const LOCALES = ['ko', 'en'] as const;
export const PAGES = ['', '/about', '/network', '/contact', '/join'] as const;

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
```

`e2e/pages.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll, LOCALES, PAGES } from './helpers';

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`/${locale}${path} renders cleanly`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });
  }
}
```

`e2e/i18n.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('English browser', () => {
  test.use({ extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
  test('root redirects to /en', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });
});

test.describe('Japanese browser', () => {
  test.use({ extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9' } });
  test('root falls back to /ko', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ko$/);
  });
});

test('unknown locale and unknown page return 404', async ({ page }) => {
  for (const path of ['/fr/about', '/ko/startups', '/en/archive']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
```

- [ ] **Step 8: Run everything**

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: unit tests PASS; build lists `/[locale]`, `/[locale]/about`, `/[locale]/network`, `/[locale]/contact`, `/[locale]/join` for `ko` and `en`; e2e PASS (pages, redirects, 404s). If axe reports `color-contrast` on the unstyled shells, the shells are unstyled black on white, so a failure here means a real bug, not styling.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: ko/en locale routing, page shells, metadata, e2e harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Brand tokens, fonts, global CSS

**Files:**
- Create: `src/lib/brand.ts`, `src/lib/fonts.ts`, `src/lib/utils.ts`
- Modify: `src/app/globals.css`, `src/app/[locale]/layout.tsx`
- Test: `tests/lib/brand.test.ts`

**Interfaces:**
- Produces: `BRAND` hex map; Tailwind color utilities `cobalt`, `lime`, `leaf`, `teal`, `sky`, `ocean`, `paper`, `paper-edge`, `ink`, `ink-soft`; font utilities `font-sans`, `font-display`, `font-mono`; `cn(...classes)`; CSS hooks `.stamp`, `[data-armed]`, `[data-inked]`, `.route`, `.route-backdrop`, `.route-backdrop__global`, `.emboss`.

- [ ] **Step 1: Write the failing token-sync test**

`tests/lib/brand.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';

const css = readFileSync('src/app/globals.css', 'utf8');
const cssName: Record<keyof typeof BRAND, string> = {
  cobalt: 'cobalt',
  lime: 'lime',
  leaf: 'leaf',
  teal: 'teal',
  sky: 'sky',
  ocean: 'ocean',
  paper: 'paper',
  paperEdge: 'paper-edge',
  ink: 'ink',
  inkSoft: 'ink-soft',
};

describe('brand tokens', () => {
  for (const [key, hex] of Object.entries(BRAND)) {
    it(`globals.css defines --color-${cssName[key as keyof typeof BRAND]} as ${hex}`, () => {
      expect(css).toContain(`--color-${cssName[key as keyof typeof BRAND]}: ${hex};`);
    });
  }
});
```

Run: `pnpm test tests/lib/brand.test.ts`
Expected: FAIL, cannot resolve `@/lib/brand`.

- [ ] **Step 2: Implement brand, fonts, utils**

`src/lib/brand.ts`:

```ts
// Official RGB values measured from the designer's export of the RISE CREW logo (see PRODUCT.md).
export const BRAND = {
  cobalt: '#003e91',
  lime: '#9fc952',
  leaf: '#49b67e',
  teal: '#10a1c7',
  sky: '#0dbedb',
  ocean: '#0175ba',
  paper: '#f4f9f7',
  paperEdge: '#dbe9e4',
  ink: '#13203a',
  inkSoft: '#46546d',
} as const;
```

`src/lib/fonts.ts`:

```ts
export const FONT_STYLESHEETS = [
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
  'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css',
] as const;
```

```bash
pnpm add clsx tailwind-merge
```

`src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Replace `src/app/globals.css`**

```css
@import 'tailwindcss';

@theme {
  --color-cobalt: #003e91;
  --color-lime: #9fc952;
  --color-leaf: #49b67e;
  --color-teal: #10a1c7;
  --color-sky: #0dbedb;
  --color-ocean: #0175ba;
  --color-paper: #f4f9f7;
  --color-paper-edge: #dbe9e4;
  --color-ink: #13203a;
  --color-ink-soft: #46546d;

  --font-sans: 'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif;
  --font-display: 'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

/* Embossed emblem on the passport cover */
.emboss {
  filter: drop-shadow(0 1px 0 rgb(255 255 255 / 0.35)) drop-shadow(0 -1px 0 rgb(0 0 0 / 0.35));
}

/* Stamps: visible by default. JavaScript arms only off-screen stamps, then inks them once. */
.stamp {
  transform: rotate(var(--stamp-rot, 0deg));
}
.stamp[data-armed] {
  opacity: 0;
  transform: rotate(var(--stamp-rot, 0deg)) scale(1.12);
}
.stamp[data-inked] {
  animation: stamp-in 280ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
@keyframes stamp-in {
  0% {
    opacity: 0;
    transform: rotate(var(--stamp-rot, 0deg)) scale(1.12);
  }
  60% {
    opacity: 1;
    transform: rotate(var(--stamp-rot, 0deg)) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: rotate(var(--stamp-rot, 0deg)) scale(1);
  }
}

/* Route section: the guilloche shifts from blue (campus) to green (global) while scrolling. */
.route {
  view-timeline: --route block;
}
.route-backdrop__global {
  opacity: 0.5;
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .route-backdrop__global {
      opacity: 0;
      animation: route-fade linear both;
      animation-timeline: --route;
      animation-range: contain 0% contain 100%;
    }
  }
}
@keyframes route-fade {
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .route-backdrop {
    display: none;
  }
  .route [data-stage] {
    background: center / cover no-repeat;
  }
  .route [data-stage='campus'] {
    background-image: url(/patterns/blue.svg);
  }
  .route [data-stage='domestic'] {
    background-image: url(/patterns/teal.svg);
  }
  .route [data-stage='global'] {
    background-image: url(/patterns/green.svg);
  }
}
```

Run: `pnpm test tests/lib/brand.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 4: Load fonts in the layout**

Replace `src/app/[locale]/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { routing } from '@/i18n/routing';
import { FONT_STYLESHEETS } from '@/lib/fonts';
import { getSiteUrl } from '@/lib/site';
import '../globals.css';

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = { metadataBase: getSiteUrl() };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <html lang={locale} className={mono.variable}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {FONT_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} precedence="default" />
        ))}
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: logo-derived color tokens, Korean web fonts, passport CSS hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Passport primitives

Read `.claude/skills/impeccable/reference/craft-floor.md` before editing UI.

**Files:**
- Create: `src/lib/passport.ts`, `src/lib/guilloche.ts`, `src/app/patterns/[name]/route.ts`, `scripts/generate-rise-symbol.mjs`, `src/components/brand/rise-symbol.tsx` (generated), `src/components/passport/{guilloche,data-page,mrz-line,stamp,stamp-trail,boarding-pass,partner-mark}.tsx`, `src/components/passport/{labels,stamp-labels}.ts`
- Test: `tests/lib/passport.test.ts`, `tests/lib/guilloche.test.ts`

**Interfaces:**
- Consumes: `BRAND`, `cn`, `Locale`, `Stamp`, `Partner`, `pick`, `StampState`, `ApplyCta`, `Link`.
- Produces:
  - `guillochePath(o: { cx: number; cy: number; radius: number; amplitude: number; petals: number; steps: number; phase?: number }): string`
  - `toMrz(fields: readonly string[], width?: number): string` (always exactly `width`, default 44)
  - `stampRotation(id: string): number` (integer in -5..5)
  - `formatStampDate(date: string, locale: Locale): string`
  - `PALETTES = ['blue','teal','green','white']`, `type Palette`, `isPalette(v)`, `guillocheSvg(p: Palette): string`
  - Components: `RiseSymbol({ className?, title? })`, `Guilloche({ palette?, className? })`, `FIELD` labels and `type FieldLabel`, `DataPage({ children, className?, mrz? })`, `DataField({ label, children, wide? })`, `MrzLine({ value, className? })`, `Stamp({ stamp, state, locale, labels })`, `StampTrail({ children, className? })`, `getStampLabels(): Promise<StampLabels>`, `BoardingPass({ cta, className? })`, `PartnerMark({ partner, locale })`

- [ ] **Step 1: Write the failing helper tests**

`tests/lib/passport.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatStampDate, guillochePath, stampRotation, toMrz } from '@/lib/passport';

describe('guillochePath', () => {
  const opts = { cx: 500, cy: 500, radius: 200, amplitude: 20, petals: 12, steps: 120 };

  it('is a closed path with one point per step', () => {
    const d = guillochePath(opts);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/[ML]/g)).toHaveLength(120);
  });
  it('is deterministic', () => {
    expect(guillochePath(opts)).toBe(guillochePath(opts));
  });
  it('rejects fewer than 3 steps', () => {
    expect(() => guillochePath({ ...opts, steps: 2 })).toThrow(RangeError);
  });
});

describe('toMrz', () => {
  it('joins fields with << and pads with < to 44 characters', () => {
    const mrz = toMrz(['RISE CREW', 'SKKU', 'KOR']);
    expect(mrz).toHaveLength(44);
    expect(mrz.startsWith('RISE<CREW<<SKKU<<KOR<')).toBe(true);
  });
  it('drops characters outside A-Z and 0-9, including Hangul', () => {
    expect(toMrz(['라이즈 크루', 'Café 2025'])).toBe('CAFE<2025'.padEnd(44, '<'));
  });
  it('truncates long input to the width', () => {
    expect(toMrz(['A'.repeat(60)])).toBe('A'.repeat(44));
  });
});

describe('stampRotation', () => {
  it('is a stable integer between -5 and 5', () => {
    for (const id of ['aix-contest', 'sushi-tech', 'a', 'kuala-lumpur-ir']) {
      const r = stampRotation(id);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(-5);
      expect(r).toBeLessThanOrEqual(5);
      expect(stampRotation(id)).toBe(r);
    }
  });
});

describe('formatStampDate', () => {
  it('formats Korean dates with dots', () => {
    expect(formatStampDate('2026-01-30', 'ko')).toBe('2026.01.30');
    expect(formatStampDate('2026-04', 'ko')).toBe('2026.04');
    expect(formatStampDate('2025', 'ko')).toBe('2025');
  });
  it('formats English dates passport-style', () => {
    expect(formatStampDate('2026-01-30', 'en')).toBe('30 JAN 2026');
    expect(formatStampDate('2026-04', 'en')).toBe('APR 2026');
    expect(formatStampDate('2025', 'en')).toBe('2025');
  });
});
```

`tests/lib/guilloche.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

describe('guillocheSvg', () => {
  it('renders 7 rings for every palette', () => {
    for (const p of PALETTES) {
      const svg = guillocheSvg(p);
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg.match(/<path /g)).toHaveLength(7);
    }
  });
  it('uses logo colors for the blue and green palettes', () => {
    expect(guillocheSvg('blue')).toContain(BRAND.cobalt);
    expect(guillocheSvg('green')).toContain(BRAND.lime);
  });
  it('recognizes palettes', () => {
    expect(isPalette('teal')).toBe(true);
    expect(isPalette('navy')).toBe(false);
  });
});
```

Run: `pnpm test tests/lib/passport.test.ts tests/lib/guilloche.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 2: Implement the helpers**

`src/lib/passport.ts`:

```ts
import type { Locale } from '@/i18n/locales';

type GuillocheOptions = {
  cx: number;
  cy: number;
  radius: number;
  amplitude: number;
  petals: number;
  steps: number;
  phase?: number;
};

export function guillochePath({ cx, cy, radius, amplitude, petals, steps, phase = 0 }: GuillocheOptions): string {
  if (steps < 3) throw new RangeError('steps must be at least 3');
  let d = '';
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(petals * theta + phase);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

export function toMrz(fields: readonly string[], width = 44): string {
  const encoded = fields
    .map((field) =>
      field
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '<')
        .replace(/^<+|<+$/g, ''),
    )
    .filter(Boolean)
    .join('<<');
  return encoded.length >= width ? encoded.slice(0, width) : encoded.padEnd(width, '<');
}

export function stampRotation(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 11) - 5;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatStampDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  if (locale === 'ko') return day ? `${year}.${month}.${day}` : `${year}.${month}`;
  const name = MONTHS[Number(month) - 1];
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}
```

`src/lib/guilloche.ts`:

```ts
import { BRAND } from './brand';
import { guillochePath } from './passport';

export const PALETTES = ['blue', 'teal', 'green', 'white'] as const;
export type Palette = (typeof PALETTES)[number];

export function isPalette(value: string): value is Palette {
  return (PALETTES as readonly string[]).includes(value);
}

const STOPS: Record<Palette, readonly string[]> = {
  blue: [BRAND.cobalt, BRAND.ocean, BRAND.sky],
  teal: [BRAND.ocean, BRAND.teal, BRAND.leaf],
  green: [BRAND.teal, BRAND.leaf, BRAND.lime],
  white: ['#ffffff', '#ffffff', '#ffffff'],
};

export function guillocheSvg(palette: Palette): string {
  const stops = STOPS[palette]
    .map((color, i, all) => `<stop offset="${i / (all.length - 1)}" stop-color="${color}"/>`)
    .join('');
  const rings = Array.from({ length: 7 }, (_, i) =>
    `<path d="${guillochePath({ cx: 500, cy: 500, radius: 110 + i * 52, amplitude: 14 + i * 3, petals: 18 + i * 6, steps: 480, phase: i * 0.6 })}"/>`,
  ).join('');
  const opacity = palette === 'white' ? 0.16 : 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><g fill="none" stroke="url(#g)" stroke-width="1.1" opacity="${opacity}">${rings}</g></svg>`;
}
```

Run: `pnpm test tests/lib/passport.test.ts tests/lib/guilloche.test.ts`
Expected: PASS.

- [ ] **Step 3: Static pattern route**

`src/app/patterns/[name]/route.ts`:

```ts
import { guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return PALETTES.map((palette) => ({ name: `${palette}.svg` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const palette = (await params).name.replace(/\.svg$/, '');
  if (!isPalette(palette)) return new Response('Not found', { status: 404 });
  return new Response(guillocheSvg(palette), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

- [ ] **Step 4: Generate the logo symbol component**

`scripts/generate-rise-symbol.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('public/brand/rise-crew-symbol-mono.svg', 'utf8');
const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
const transform = svg.match(/<g transform="([^"]+)"/)[1];
const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());

const out = `// Generated by scripts/generate-rise-symbol.mjs from public/brand/rise-crew-symbol-mono.svg. Do not edit by hand.
type Props = { className?: string; title?: string };

export function RiseSymbol({ className, title }: Props) {
  return (
    <svg
      viewBox="${viewBox}"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g transform="${transform}" fill="currentColor">
${paths.map((d) => `        <path d="${d}" />`).join('\n')}
      </g>
    </svg>
  );
}
`;

mkdirSync('src/components/brand', { recursive: true });
writeFileSync('src/components/brand/rise-symbol.tsx', out);
console.log(`wrote ${paths.length} path(s)`);
```

Run: `node scripts/generate-rise-symbol.mjs`
Expected: `wrote 1 path(s)`.

- [ ] **Step 5: Passport components**

`src/components/passport/guilloche.tsx`:

```tsx
import type { Palette } from '@/lib/guilloche';
import { cn } from '@/lib/utils';

export function Guilloche({ palette = 'blue', className }: { palette?: Palette; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none bg-cover bg-center bg-no-repeat', className)}
      style={{ backgroundImage: `url(/patterns/${palette}.svg)` }}
    />
  );
}
```

`src/components/passport/labels.ts`:

```ts
export type FieldLabel = { ko: string; en: string };

// Passport data pages always print both languages, whatever the page locale.
export const FIELD = {
  name: { ko: '명칭', en: 'Name' },
  affiliation: { ko: '소속', en: 'Affiliation' },
  established: { ko: '설립', en: 'Established' },
  supporter: { ko: '지원 기관', en: 'Supported by' },
  partnership: { ko: '협약', en: 'Partnership' },
  members: { ko: '멤버', en: 'Members' },
  teams: { ko: '창업팀', en: 'Startup teams' },
  mentors: { ko: '멘토', en: 'Mentors' },
  person: { ko: '성명', en: 'Name' },
  org: { ko: '소속', en: 'Organization' },
  role: { ko: '직함', en: 'Title' },
  expertise: { ko: '전문 분야', en: 'Expertise' },
  email: { ko: '이메일', en: 'Email' },
  address: { ko: '주소', en: 'Address' },
  status: { ko: '상태', en: 'Status' },
  period: { ko: '기간', en: 'Period' },
  goal: { ko: '목표', en: 'Goal' },
  brand: { ko: '사업 브랜드', en: 'Program brand' },
} as const satisfies Record<string, FieldLabel>;
```

`src/components/passport/mrz-line.tsx`:

```tsx
import { cn } from '@/lib/utils';

export function MrzLine({ value, className }: { value: string; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        'overflow-hidden font-mono text-[clamp(9px,2.4vw,13px)] tracking-[0.2em] whitespace-nowrap text-ink-soft',
        className,
      )}
    >
      {value}
    </p>
  );
}
```

`src/components/passport/data-page.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Guilloche } from './guilloche';
import type { FieldLabel } from './labels';
import { MrzLine } from './mrz-line';

export function DataPage({ children, className, mrz }: { children: ReactNode; className?: string; mrz?: string }) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-lg border border-paper-edge bg-paper text-ink', className)}>
      <Guilloche palette="blue" className="absolute inset-0 -z-10 opacity-40" />
      <dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2 md:p-8">{children}</dl>
      {mrz ? <MrzLine value={mrz} className="border-t border-paper-edge px-6 py-3 md:px-8" /> : null}
    </div>
  );
}

export function DataField({ label, children, wide }: { label: FieldLabel; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-soft uppercase">
        <span lang="ko">{label.ko}</span> / <span lang="en">{label.en}</span>
      </dt>
      <dd className="mt-1 text-lg font-semibold break-keep text-cobalt">{children}</dd>
    </div>
  );
}
```

`src/components/passport/stamp-labels.ts`:

```ts
import { getTranslations } from 'next-intl/server';

export type StampLabels = { upcoming: string; unconfirmed: string; dateTbc: string; source: string };

export async function getStampLabels(): Promise<StampLabels> {
  const t = await getTranslations('Common');
  return { upcoming: t('upcoming'), unconfirmed: t('unconfirmed'), dateTbc: t('dateTbc'), source: t('source') };
}
```

`src/components/passport/stamp.tsx`:

```tsx
import type { CSSProperties } from 'react';
import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, type StampState } from '@/lib/content';
import { formatStampDate, stampRotation } from '@/lib/passport';
import { cn } from '@/lib/utils';
import type { StampLabels } from './stamp-labels';

const BORDER = { campus: 'border-cobalt', domestic: 'border-ocean', global: 'border-leaf' } as const;

type Props = { stamp: StampData; state: StampState; locale: Locale; labels: StampLabels };

export function Stamp({ stamp, state, locale, labels }: Props) {
  const source = stamp.evidence.find((e) => e.url);
  const date = stamp.date ? formatStampDate(stamp.date, locale) : labels.dateTbc;
  const content = (
    <>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
        {stamp.country} · {date}
      </span>
      <span className="font-display text-xl leading-none font-[800] break-keep uppercase">{pick(stamp.city, locale)}</span>
      <span className="text-sm leading-snug break-keep">{pick(stamp.title, locale)}</span>
      {state === 'done' ? null : (
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
          {state === 'upcoming' ? labels.upcoming : labels.unconfirmed}
        </span>
      )}
    </>
  );

  return (
    <article
      data-stamp
      data-state={state}
      style={{ '--stamp-rot': `${stampRotation(stamp.id)}deg` } as CSSProperties}
      className={cn(
        'stamp flex min-h-40 flex-col justify-center gap-2 rounded-2xl border-[3px] bg-white/70 p-5 text-center',
        state === 'done' ? cn(BORDER[stamp.stage], 'text-cobalt') : 'border-dashed border-ink-soft/60 text-ink-soft',
      )}
    >
      {source?.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="flex flex-col gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ocean">
          {content}
          <span className="sr-only">{labels.source}</span>
        </a>
      ) : (
        content
      )}
    </article>
  );
}
```

`src/components/passport/stamp-trail.tsx`:

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Stamps render visible on the server. On capable clients, only stamps below the fold are
// armed (hidden) and then inked once when they scroll into view. No JS or reduced motion: nothing hides.
export function StampTrail({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pending = Array.from(root.querySelectorAll<HTMLElement>('[data-stamp]')).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.9,
    );
    for (const el of pending) el.dataset.armed = '';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          delete el.dataset.armed;
          el.dataset.inked = '';
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    for (const el of pending) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

`src/components/passport/boarding-pass.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';
import { cn } from '@/lib/utils';

export async function BoardingPass({ cta, className }: { cta: ApplyCta; className?: string }) {
  const t = await getTranslations('Cta');
  const label = cta.kind === 'apply' ? t('apply') : t('notice');
  const classes = cn(
    'inline-flex items-stretch rounded-xl bg-paper text-left text-ink shadow-[0_12px_32px_-14px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-px active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-lime',
    className,
  );
  const inner = (
    <>
      <span className="flex flex-col gap-1 px-5 py-4">
        <span className="font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase">{t('passLabel')}</span>
        <span className="font-display text-2xl leading-tight font-[850] text-cobalt">{label}</span>
        <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">{t('route')}</span>
      </span>
      <span aria-hidden className="flex flex-col items-center justify-center border-l-2 border-dashed border-paper-edge px-4 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
        {t('gate')}
        <span className="font-display text-xl font-[800] text-cobalt">50322</span>
      </span>
    </>
  );

  return cta.kind === 'apply' ? (
    <a href={cta.href} target="_blank" rel="noreferrer" className={classes}>
      {inner}
    </a>
  ) : (
    <Link href="/join" className={classes}>
      {inner}
    </Link>
  );
}
```

`src/components/passport/partner-mark.tsx`:

```tsx
/* eslint-disable @next/next/no-img-element */
import type { Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';

export function PartnerMark({ partner, locale }: { partner: Partner; locale: Locale }) {
  const name = pick(partner.name, locale);
  const mark =
    partner.logo && partner.logoApproved ? (
      <img src={partner.logo} alt={name} className="h-8 w-auto" />
    ) : (
      <span className="font-semibold break-keep text-cobalt">{name}</span>
    );
  return partner.url ? (
    <a href={partner.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
      {mark}
    </a>
  ) : (
    mark
  );
}
```

- [ ] **Step 6: Verify**

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm build
curl -s http://127.0.0.1:3100/patterns/blue.svg | head -c 80 || true
```

Start the server for the curl check with `pnpm start --port 3100 &`, then stop it with `kill %1`. Expected: tests PASS, build PASS, the SVG response starts with `<svg xmlns="http://www.w3.org/2000/svg"`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: passport primitives (guilloche route, data page, stamps, MRZ, boarding pass)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Site chrome (header, footer, language switch, mobile menu)

Read `.claude/skills/impeccable/reference/craft-floor.md` before editing UI.

**Files:**
- Create: `src/components/site/{site-header,site-footer,locale-switch,mobile-nav,page-cover,section-heading}.tsx`
- Modify: `src/app/[locale]/layout.tsx`, `src/app/[locale]/not-found.tsx`
- Test: `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: `Link`, `usePathname` (Task 4), `RiseSymbol`, `Guilloche` (Task 6), `cn`.
- Produces: `SiteHeader()`, `SiteFooter()`, `LocaleSwitch({ tone? })`, `MobileNav({ items, joinLabel, menuLabel })`, `PageCover({ kicker, title, lead?, children? })`, `SectionHeading({ id, kicker, title, body? })`, `NAV_ITEMS`.

- [ ] **Step 1: Write the failing navigation tests**

`e2e/navigation.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('language switch keeps the current page', async ({ page, isMobile }) => {
  await page.goto('/ko/about');
  if (isMobile) await page.getByText('메뉴', { exact: true }).click();
  await page.getByRole('link', { name: 'English' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: '본문으로 건너뛰기' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('opens, navigates and closes', async ({ page }) => {
    await page.goto('/ko');
    await page.getByText('메뉴', { exact: true }).click();
    await page.getByRole('navigation', { name: '메뉴' }).getByRole('link', { name: '네트워크' }).click();
    await expect(page).toHaveURL(/\/ko\/network$/);
    await expect(page.locator('details[open]')).toHaveCount(0);
  });
});
```

Run: `pnpm build && pnpm e2e e2e/navigation.spec.ts`
Expected: FAIL (no header yet).

- [ ] **Step 2: Implement the chrome components**

`src/components/site/locale-switch.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LocaleSwitch({ tone = 'light' }: { tone?: 'light' | 'ink' }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Nav');
  const target = locale === 'ko' ? 'en' : 'ko';

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      className={cn(
        'font-mono text-xs tracking-[0.2em] uppercase underline-offset-4 hover:underline',
        tone === 'light' ? 'text-white' : 'text-cobalt',
      )}
    >
      {t('switchTo')}
    </Link>
  );
}
```

`src/components/site/mobile-nav.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from './locale-switch';

type Item = { href: string; label: string };

export function MobileNav({ items, joinLabel, menuLabel }: { items: Item[]; joinLabel: string; menuLabel: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute('open');
  }, [pathname]);

  return (
    <details ref={ref} className="relative md:hidden">
      <summary className="cursor-pointer list-none rounded border border-white/50 px-3 py-2 font-mono text-xs tracking-[0.2em] text-white uppercase [&::-webkit-details-marker]:hidden">
        {menuLabel}
      </summary>
      <nav aria-label={menuLabel} className="absolute right-0 mt-3 w-64 rounded-lg bg-paper p-3 text-ink shadow-xl">
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block rounded px-3 py-3 hover:bg-paper-edge">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t border-paper-edge px-3 pt-3">
          <LocaleSwitch tone="ink" />
          <Link href="/join" className="rounded bg-cobalt px-4 py-2 font-semibold text-white">
            {joinLabel}
          </Link>
        </div>
      </nav>
    </details>
  );
}
```

`src/components/site/site-header.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { LocaleSwitch } from './locale-switch';
import { MobileNav } from './mobile-nav';

export const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/about', key: 'about' },
  { href: '/network', key: 'network' },
  { href: '/contact', key: 'contact' },
] as const;

export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const items = NAV_ITEMS.map((item) => ({ href: item.href, label: t(item.key) }));

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-cobalt"
      >
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-white">
          <RiseSymbol className="h-8 w-auto" />
          <span className="font-display text-lg font-[800] tracking-wide">RISE CREW</span>
        </Link>
        <nav aria-label={t('primary')} className="hidden items-center gap-7 text-white md:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
          <LocaleSwitch />
          <Link
            href="/join"
            className="rounded bg-white px-4 py-2 font-semibold text-cobalt transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {t('join')}
          </Link>
        </nav>
        <MobileNav items={items} joinLabel={t('join')} menuLabel={t('menu')} />
      </div>
    </header>
  );
}
```

`src/components/site/site-footer.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { NAV_ITEMS } from './site-header';

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const nav = await getTranslations('Nav');

  return (
    <footer className="bg-cobalt text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <RiseSymbol className="h-10 w-auto" />
          <p className="mt-4 font-display text-2xl font-[800]">RISE CREW</p>
          <p className="mt-2 text-white/85">{t('tagline')}</p>
          <p className="mt-1 text-sm break-keep text-white/75">{t('supportedBy')}</p>
        </div>
        <nav aria-label={nav('footer')}>
          <ul className="flex flex-col gap-2">
            {[...NAV_ITEMS, { href: '/join', key: 'join' } as const].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm text-white/85">
          <a href="mailto:risecrew4@gmail.com" className="underline-offset-4 hover:underline">
            risecrew4@gmail.com
          </a>
          <p className="mt-2 break-keep">{t('address')}</p>
        </div>
      </div>
      <p className="border-t border-white/15 px-5 py-5 text-center font-mono text-[11px] tracking-[0.2em] text-white/75">
        {t('rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
```

`src/components/site/page-cover.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Guilloche } from '@/components/passport/guilloche';

type Props = { kicker: string; title: string; lead?: string; children?: ReactNode };

export function PageCover({ kicker, title, lead, children }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-cobalt text-white">
      <Guilloche palette="white" className="absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl px-5 pt-32 pb-16 md:px-10 md:pt-40 md:pb-24">
        <p className="font-mono text-xs tracking-[0.3em] text-white/80 uppercase">{kicker}</p>
        <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,6vw,5rem)] leading-none font-[850] text-balance break-keep">
          {title}
        </h1>
        {lead ? <p className="mt-6 max-w-2xl text-lg break-keep text-white/85">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
```

`src/components/site/section-heading.tsx`:

```tsx
type Props = { id: string; kicker: string; title: string; body?: string };

export function SectionHeading({ id, kicker, title, body }: Props) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs tracking-[0.3em] text-ocean uppercase">{kicker}</p>
      <h2 id={id} className="mt-3 font-display text-[clamp(1.9rem,4vw,3.25rem)] leading-[1.05] font-[800] text-balance break-keep text-cobalt">
        {title}
      </h2>
      {body ? <p className="mt-4 text-lg break-keep text-ink-soft">{body}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Wire chrome into the layout and 404**

In `src/app/[locale]/layout.tsx`, import `SiteHeader` and `SiteFooter` and change the body to:

```tsx
<body className="bg-paper font-sans text-ink antialiased">
  <NextIntlClientProvider>
    <SiteHeader />
    {children}
    <SiteFooter />
  </NextIntlClientProvider>
</body>
```

Replace `src/app/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main">
      <PageCover kicker={t('kicker')} title={t('title')} lead={t('body')}>
        <Link href="/" className="mt-8 inline-block rounded bg-white px-5 py-3 font-semibold text-cobalt">
          {t('home')}
        </Link>
      </PageCover>
    </main>
  );
}
```

So every page starts on cobalt under the white header (white header text on a white page would fail the axe contrast check), import `PageCover` from `@/components/site/page-cover` in all five page shells from Task 4 and replace each `<h1>...</h1>` line inside `<main id="main">` with:

| File | Replacement |
|---|---|
| `src/app/[locale]/page.tsx` | `<PageCover kicker="RISE CREW" title={t('cover.issuer')} lead={t('cover.subline')} />` (temporary; Task 8 replaces the home page) |
| `src/app/[locale]/about/page.tsx` | `<PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />` |
| `src/app/[locale]/network/page.tsx` | `<PageCover kicker={t('kicker')} title={t('title', { count: 33 })} lead={t('lead')} />` |
| `src/app/[locale]/contact/page.tsx` | `<PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />` |
| `src/app/[locale]/join/page.tsx` | `<PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />` |

- [ ] **Step 4: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all e2e PASS, including `navigation.spec.ts` and the axe checks in `pages.spec.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: site header, footer, language switch and mobile menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Home page (passport direction)

Read `.claude/skills/impeccable/reference/craft-floor.md` and `.impeccable/surfaces/src-app-locale-page-tsx.md` before editing. The home must match the FIRST VIEWPORT and signature interaction in that contract.

**Files:**
- Create: `src/components/home/{passport-cover,identity-section,route-section,global-section,network-preview,press-section,final-cta}.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: all getters, `pick`, `stampState`, `applyCta` (Task 3); passport components (Task 6); `SectionHeading` (Task 7).
- Produces: `HomePage` with `export const revalidate = 86400` so stamp states refresh daily.

- [ ] **Step 1: Write the failing home tests**

`e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('cover shows the slogan, the stats with their basis and a working CTA', async ({ page }) => {
  await page.goto('/ko');
  const h1 = page.locator('h1');
  await expect(h1).toContainText('Reach your vision');
  await expect(h1).toContainText('Elevate your future');
  for (const value of ['90+', '22+', '33']) await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2026.01 기준').first()).toBeVisible();
  // Recruitment is closed in phase 1 data, so the boarding pass must lead to the join page.
  await expect(page.getByRole('link', { name: /모집 안내 보기/ }).first()).toHaveAttribute('href', '/ko/join');
});

test('past planned stamps say unconfirmed, not upcoming', async ({ page }) => {
  await page.goto('/en');
  const london = page.locator('[data-stamp]', { hasText: 'London' });
  await expect(london).toHaveAttribute('data-state', 'unconfirmed');
  await expect(london).toContainText('Unconfirmed');
});

test('every stamp ends up inked after scrolling', async ({ page }) => {
  await page.goto('/ko');
  const stamps = page.locator('[data-stamp]');
  const count = await stamps.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i++) {
    await stamps.nth(i).scrollIntoViewIfNeeded();
    await expect(stamps.nth(i)).toHaveCSS('opacity', '1');
  }
});

test.describe('without JavaScript and with reduced motion', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('all stamps are visible immediately', async ({ page }) => {
    await page.goto('/ko');
    const opacities = await page.locator('[data-stamp]').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(5);
    expect(opacities.every((o) => o === '1')).toBe(true);
  });
});
```

Run: `pnpm build && pnpm e2e e2e/home.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the home sections**

`src/components/home/passport-cover.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { DataField, DataPage } from '@/components/passport/data-page';
import { Guilloche } from '@/components/passport/guilloche';
import { FIELD } from '@/components/passport/labels';
import type { Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick, type ApplyCta } from '@/lib/content';
import { toMrz } from '@/lib/passport';

const SLOGAN = [
  ['R', 'each your vision,'],
  ['I', 'gnite your idea,'],
  ['S', 'cale up your impact,'],
  ['E', 'levate your future.'],
] as const;

const STAT_LABEL = { members: FIELD.members, teams: FIELD.teams, mentors: FIELD.mentors } as const;

type Props = { locale: Locale; stats: Stat[]; cta: ApplyCta };

export async function PassportCover({ locale, stats, cta }: Props) {
  const t = await getTranslations('Home.cover');
  const ctaT = await getTranslations('Cta');

  return (
    <section aria-labelledby="cover-title" className="relative isolate overflow-hidden bg-cobalt text-white">
      <Guilloche palette="white" className="absolute inset-0 -z-10" />
      <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-5 pt-28 pb-10 md:px-10">
        <p className="font-mono text-xs tracking-[0.3em] text-white/80 uppercase">{t('issuer')}</p>

        <div className="mt-10 grid flex-1 items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-14">
          <RiseSymbol className="emboss h-24 w-auto text-white/90 md:h-36 lg:h-56" />
          <h1
            id="cover-title"
            lang="en"
            className="font-display text-[clamp(2.4rem,8vw,7rem)] leading-[0.95] font-[850] tracking-[-0.02em]"
          >
            {SLOGAN.map(([initial, rest]) => (
              <span key={initial} className="block">
                <span className="text-lime">{initial}</span>
                {rest}
              </span>
            ))}
          </h1>
        </div>

        <p className="mt-6 max-w-2xl text-base break-keep text-white/85 md:text-lg">{t('subline')}</p>

        <div className="mt-10 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <DataPage mrz={toMrz(['RISE CREW', 'SKKU', 'KOR', 'EST 2025'])}>
            {stats.map((stat) => (
              <DataField key={stat.id} label={STAT_LABEL[stat.id as keyof typeof STAT_LABEL] ?? { ko: stat.label.ko, en: stat.label.en }}>
                <span className="font-display text-4xl font-[850]">{stat.value}</span>
                <span className="mt-1 block font-mono text-[11px] font-normal tracking-[0.08em] text-ink-soft">
                  {pick(stat.basis, locale)}
                </span>
              </DataField>
            ))}
          </DataPage>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <BoardingPass cta={cta} />
            <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
              {ctaT('partner')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

`src/components/home/identity-section.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { SectionHeading } from '@/components/site/section-heading';
import { toMrz } from '@/lib/passport';

export async function IdentitySection() {
  const t = await getTranslations('Home.identity');
  return (
    <section aria-labelledby="identity-title" className="bg-paper">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
        <SectionHeading id="identity-title" kicker={t('kicker')} title={t('title')} body={t('body')} />
        <DataPage mrz={toMrz(['RISE CREW', 'ANCHOR', 'SKKU'])}>
          <DataField label={FIELD.name}>RISE CREW</DataField>
          <DataField label={FIELD.established}>2025</DataField>
          <DataField label={FIELD.affiliation} wide>
            {t('affiliation')}
          </DataField>
          <DataField label={FIELD.supporter} wide>
            {t('supporter')}
          </DataField>
          <DataField label={FIELD.partnership} wide>
            {t('mou')}
          </DataField>
        </DataPage>
      </div>
    </section>
  );
}
```

`src/components/home/route-section.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Guilloche } from '@/components/passport/guilloche';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { SectionHeading } from '@/components/site/section-heading';
import type { Program, Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, stampState } from '@/lib/content';

const STAGES = ['campus', 'domestic', 'global'] as const;

type Props = { locale: Locale; stamps: StampData[]; programs: Program[]; today: Date };

export async function RouteSection({ locale, stamps, programs, today }: Props) {
  const t = await getTranslations('Home.route');
  const common = await getTranslations('Common');
  const labels = await getStampLabels();

  return (
    <section aria-labelledby="route-title" className="route relative isolate bg-paper">
      <div aria-hidden className="route-backdrop pointer-events-none sticky top-0 -z-10 -mb-[100svh] h-svh">
        <Guilloche palette="blue" className="absolute inset-0" />
        <Guilloche palette="green" className="route-backdrop__global absolute inset-0" />
      </div>
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading id="route-title" kicker={t('kicker')} title={t('title')} body={t('body')} />
        <ol className="mt-14 flex flex-col gap-16 md:gap-24">
          {STAGES.map((stage, index) => {
            const stagePrograms = programs.filter((p) => p.stage === stage);
            const stageStamps = stamps.filter((s) => s.stage === stage);
            return (
              <li key={stage} data-stage={stage} className="grid gap-8 rounded-xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div>
                  <p className="font-mono text-xs tracking-[0.3em] text-ocean">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-2 font-display text-3xl font-[800] break-keep text-cobalt">{common(`stage.${stage}`)}</h3>
                  <ul className="mt-6 flex flex-col gap-4">
                    {stagePrograms.map((program) => (
                      <li key={program.id} className="border-l-2 border-ocean/40 pl-4">
                        <p className="font-semibold break-keep text-ink">{pick(program.name, locale)}</p>
                        <p className="mt-1 break-keep text-ink-soft">{pick(program.summary, locale)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                {stage === 'global' ? (
                  <p className="self-center">
                    <a href="#global-title" className="font-semibold text-cobalt underline underline-offset-4">
                      {t('globalNote')} ↓
                    </a>
                  </p>
                ) : (
                  <StampTrail className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {stageStamps.map((stamp) => (
                      <Stamp key={stamp.id} stamp={stamp} state={stampState(stamp, today)} locale={locale} labels={labels} />
                    ))}
                  </StampTrail>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
```

`src/components/home/global-section.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { SectionHeading } from '@/components/site/section-heading';
import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { stampState } from '@/lib/content';

type Props = { locale: Locale; stamps: StampData[]; today: Date };

export async function GlobalSection({ locale, stamps, today }: Props) {
  const t = await getTranslations('Home.global');
  const labels = await getStampLabels();
  const global = stamps.filter((s) => s.stage === 'global');

  return (
    <section aria-labelledby="global-title" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading id="global-title" kicker={t('kicker')} title={t('title')} body={t('body')} />
        <StampTrail className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {global.map((stamp) => (
            <Stamp key={stamp.id} stamp={stamp} state={stampState(stamp, today)} locale={locale} labels={labels} />
          ))}
        </StampTrail>
      </div>
    </section>
  );
}
```

`src/components/home/network-preview.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PartnerMark } from '@/components/passport/partner-mark';
import { SectionHeading } from '@/components/site/section-heading';
import type { Mentor, Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick } from '@/lib/content';

type Props = { locale: Locale; mentorCount: string; mentors: Mentor[]; partners: Partner[] };

export async function NetworkPreview({ locale, mentorCount, mentors, partners }: Props) {
  const t = await getTranslations('Home.network');
  const featured = mentors.filter((m) => m.featured);

  return (
    <section aria-labelledby="network-title" className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading id="network-title" kicker={t('kicker')} title={t('title', { count: mentorCount })} body={t('body')} />
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {featured.map((mentor) => (
            <li key={mentor.id}>
              <DataPage>
                <DataField label={FIELD.person}>{pick(mentor.name, locale)}</DataField>
                <DataField label={FIELD.org}>{pick(mentor.org, locale)}</DataField>
                <DataField label={FIELD.role} wide>
                  {pick(mentor.role, locale)}
                </DataField>
              </DataPage>
            </li>
          ))}
        </ul>
        <h3 className="mt-14 font-mono text-xs tracking-[0.3em] text-ocean uppercase">{t('partners')}</h3>
        <ul className="mt-4 flex flex-wrap gap-3">
          {partners.map((partner) => (
            <li key={partner.id} className="rounded-full border border-cobalt/25 bg-white px-4 py-2">
              <PartnerMark partner={partner} locale={locale} />
            </li>
          ))}
        </ul>
        <Link href="/network" className="mt-10 inline-block font-semibold text-cobalt underline underline-offset-4">
          {t('cta')} →
        </Link>
      </div>
    </section>
  );
}
```

`src/components/home/press-section.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '@/components/site/section-heading';
import type { Press } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { formatStampDate } from '@/lib/passport';

export async function PressSection({ locale, press }: { locale: Locale; press: Press[] }) {
  const t = await getTranslations('Home.press');
  return (
    <section aria-labelledby="press-title" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
        <SectionHeading id="press-title" kicker={t('kicker')} title={t('title')} />
        <ul className="mt-10 divide-y divide-paper-edge border-y border-paper-edge">
          {press.map((item) => {
            const title = (
              <span lang="ko" className="text-lg font-semibold break-keep text-cobalt">
                {item.title}
              </span>
            );
            return (
              <li key={item.id} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
                <p className="font-mono text-xs tracking-[0.15em] text-ink-soft uppercase">
                  {pick(item.outlet, locale)} · {formatStampDate(item.date, locale)}
                </p>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                    {title}
                  </a>
                ) : (
                  title
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
```

`src/components/home/final-cta.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { Guilloche } from '@/components/passport/guilloche';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';

export async function FinalCta({ cta }: { cta: ApplyCta }) {
  const t = await getTranslations('Home.final');
  const ctaT = await getTranslations('Cta');
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden bg-cobalt text-white">
      <Guilloche palette="white" className="absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-24 md:px-10 md:py-32">
        <h2 id="final-title" className="max-w-3xl font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-none font-[850] break-keep">
          {t('title')}
        </h2>
        <p className="max-w-xl text-lg break-keep text-white/85">{t('body')}</p>
        <div className="flex flex-wrap items-center gap-6">
          <BoardingPass cta={cta} />
          <Link href="/contact" className="font-semibold underline underline-offset-4">
            {ctaT('partner')}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Assemble the home page**

Replace `src/app/[locale]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FinalCta } from '@/components/home/final-cta';
import { GlobalSection } from '@/components/home/global-section';
import { IdentitySection } from '@/components/home/identity-section';
import { NetworkPreview } from '@/components/home/network-preview';
import { PassportCover } from '@/components/home/passport-cover';
import { PressSection } from '@/components/home/press-section';
import { RouteSection } from '@/components/home/route-section';
import { asLocale } from '@/i18n/as-locale';
import {
  applyCta,
  getMentors,
  getPartners,
  getPress,
  getPrograms,
  getRecruitment,
  getStamps,
  getStats,
} from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.home' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '') };
}

export default async function HomePage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  const [stats, stamps, programs, mentors, partners, press, recruitment] = await Promise.all([
    getStats(),
    getStamps(),
    getPrograms(),
    getMentors(),
    getPartners(),
    getPress(),
    getRecruitment(),
  ]);
  const cta = applyCta(recruitment);
  const today = new Date();
  const mentorCount = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);

  return (
    <main id="main">
      <PassportCover locale={locale} stats={stats} cta={cta} />
      <IdentitySection />
      <RouteSection locale={locale} stamps={stamps} programs={programs} today={today} />
      <GlobalSection locale={locale} stamps={stamps} today={today} />
      <NetworkPreview locale={locale} mentorCount={mentorCount} mentors={mentors} partners={partners} />
      <PressSection locale={locale} press={press} />
      <FinalCta cta={cta} />
    </main>
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all e2e PASS, including `home.spec.ts` and the home rows of `pages.spec.ts` (no horizontal scroll at 390px, no serious axe violations).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: passport home page with stamps, route and boarding pass

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: About page

Read `.claude/skills/impeccable/reference/craft-floor.md` before editing UI.

**Files:**
- Modify: `src/app/[locale]/about/page.tsx`
- Test: `e2e/about.spec.ts`

**Interfaces:**
- Consumes: `getGrowthSteps`, `getPrograms`, `getOfficers`, `getMentors`, `getStamps`, `stampState`, `pick`; `PageCover`, `SectionHeading`, `DataPage`, `DataField`, `FIELD`, `Stamp`, `StampTrail`, `getStampLabels`.

- [ ] **Step 1: Write the failing test**

`e2e/about.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('about shows the five-step plan, programs, crew and history', async ({ page }) => {
  await page.goto('/ko/about');
  await expect(page.getByRole('heading', { name: '5단계 육성 플랜' })).toBeVisible();
  await expect(page.locator('[data-step]')).toHaveCount(5);
  await expect(page.getByText('VCC (Venture Creation Course)')).toBeVisible();
  await expect(page.getByText('운영진의 이름과 사진은 게시 동의를 받은 뒤 공개합니다.')).toBeVisible();
  await expect(page.getByText('신동원')).toBeVisible(); // faculty advisor, public mentor record
  expect(await page.locator('[data-stamp]').count()).toBeGreaterThan(5);
});
```

Run: `pnpm build && pnpm e2e e2e/about.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the page**

Replace `src/app/[locale]/about/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import { getGrowthSteps, getMentors, getOfficers, getPrograms, getStamps, pick, stampState } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';
import { toMrz } from '@/lib/passport';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.about' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '/about') };
}

export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('About');
  const labels = await getStampLabels();
  const [steps, programs, officers, mentors, stamps] = await Promise.all([
    getGrowthSteps(),
    getPrograms(),
    getOfficers(),
    getMentors(),
    getStamps(),
  ]);
  const advisor = mentors.find((m) => m.id === 'shin-dongwon');
  const today = new Date();
  const rise = (['r', 'i', 's', 'e'] as const).map((key) => t(`rise.${key}`));

  return (
    <main id="main">
      <PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />

      <section aria-labelledby="rise-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="rise-title" kicker={t('rise.kicker')} title={t('rise.title')} body={t('rise.born')} />
          <ol className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {rise.map((line) => (
              <li key={line} className="py-5 font-display text-2xl font-[800] break-keep text-cobalt">
                <span className="text-ocean">{line.slice(0, 1)}</span>
                {line.slice(1)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="supporter-title" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="supporter-title" kicker={t('supporter.kicker')} title={t('supporter.title')} body={t('supporter.body')} />
          <DataPage mrz={toMrz(['SKKU', 'ANCHOR', '2025', '2030'])}>
            <DataField label={FIELD.goal} wide>
              {t('supporter.kpiFunding')}
            </DataField>
            <DataField label={FIELD.goal} wide>
              {t('supporter.kpiGlobal')}
            </DataField>
            <DataField label={FIELD.period} wide>
              2025.06 – 2030.02
            </DataField>
            <DataField label={FIELD.brand} wide>
              <span lang="en">SKKU with Seoul, My Soulmate</span>
            </DataField>
          </DataPage>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="steps-title" kicker={t('steps.kicker')} title={t('steps.title')} body={t('steps.body')} />
          <ol className="mt-12 grid gap-5 md:grid-cols-5">
            {steps.map((step) => (
              <li key={step.id} data-step className="rounded-lg border border-paper-edge bg-white p-5">
                <p className="font-mono text-xs tracking-[0.3em] text-ocean">{String(step.order).padStart(2, '0')}</p>
                <p lang="en" className="mt-2 font-display text-xl font-[800] text-cobalt">
                  {pick(step.name, locale)}
                </p>
                <p className="mt-2 text-sm break-keep text-ink-soft">{pick(step.summary, locale)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="programs-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="programs-title" kicker={t('programs.kicker')} title={t('programs.title')} />
          <ul className="mt-12 grid gap-8 md:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id} className="border-t-2 border-cobalt pt-5">
                <h3 className="font-display text-2xl font-[800] break-keep text-cobalt">{pick(program.name, locale)}</h3>
                <p className="mt-2 break-keep text-ink-soft">{pick(program.summary, locale)}</p>
                {program.details.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-2 text-sm break-keep text-ink">
                    {program.details.map((detail) => (
                      <li key={detail.en} className="border-l-2 border-ocean/40 pl-3">
                        {pick(detail, locale)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="crew-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="crew-title" kicker={t('crew.kicker')} title={t('crew.title')} body={t('crew.pending')} />
          {advisor ? (
            <DataPage className="mt-10 max-w-2xl">
              <DataField label={FIELD.role}>{t('crew.advisor')}</DataField>
              <DataField label={FIELD.person}>{pick(advisor.name, locale)}</DataField>
              <DataField label={FIELD.org} wide>
                {pick(advisor.org, locale)}
              </DataField>
            </DataPage>
          ) : null}
          <ul className="mt-8 flex flex-wrap gap-3">
            {officers.map((officer) => (
              <li key={officer.id} className="rounded-full border border-cobalt/25 bg-white px-4 py-2 font-semibold text-cobalt">
                {pick(officer.role, locale)}
                {officer.consent && officer.name ? ` · ${pick(officer.name, locale)}` : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="history-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="history-title" kicker={t('history.kicker')} title={t('history.title')} />
          <StampTrail className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {stamps.map((stamp) => (
              <Stamp key={stamp.id} stamp={stamp} state={stampState(stamp, today)} locale={locale} labels={labels} />
            ))}
          </StampTrail>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: about page with growth plan, programs, crew and history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Network page

Read `.claude/skills/impeccable/reference/craft-floor.md` before editing UI.

**Files:**
- Modify: `src/app/[locale]/network/page.tsx`
- Test: `e2e/network.spec.ts`

- [ ] **Step 1: Write the failing test**

`e2e/network.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('network lists 19 named mentors, partners and the MOU', async ({ page }) => {
  await page.goto('/en/network');
  await expect(page.locator('[data-mentor]')).toHaveCount(19);
  await expect(page.getByText('19 of our 33 mentors are listed by name.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Partnership with Kakao Mobility' })).toBeVisible();
  await expect(page.getByText('SKKU ANCHOR Division').first()).toBeVisible();
});
```

Run: `pnpm build && pnpm e2e e2e/network.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the page**

Replace `src/app/[locale]/network/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PartnerMark } from '@/components/passport/partner-mark';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import type { Partner } from '@/content/schema';
import { asLocale } from '@/i18n/as-locale';
import { getMentors, getPartners, getStats, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const KINDS: Partner['kind'][] = ['supporter', 'company', 'university', 'program'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.network' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '/network') };
}

export default async function NetworkPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Network');
  const [mentors, partners, stats] = await Promise.all([getMentors(), getPartners(), getStats()]);
  const total = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);

  return (
    <main id="main">
      <PageCover kicker={t('kicker')} title={t('title', { count: total })} lead={t('lead')} />

      <section aria-labelledby="mentors-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading
            id="mentors-title"
            kicker="MENTORS"
            title={t('mentors.title')}
            body={t('mentors.note', { listed: mentors.length, total })}
          />
          <ul className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {mentors.map((mentor) => (
              <li key={mentor.id} data-mentor>
                <DataPage className="h-full">
                  <DataField label={FIELD.person}>{pick(mentor.name, locale)}</DataField>
                  <DataField label={FIELD.org}>{pick(mentor.org, locale)}</DataField>
                  <DataField label={FIELD.role} wide>
                    {pick(mentor.role, locale)}
                  </DataField>
                  <DataField label={FIELD.expertise} wide>
                    <span className="text-base font-normal text-ink">
                      {mentor.expertise.map((e) => pick(e, locale)).join(' · ')}
                    </span>
                  </DataField>
                </DataPage>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="partners-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="partners-title" kicker="PARTNERS" title={t('partners.title')} />
          <dl className="mt-12 grid gap-8 md:grid-cols-2">
            {KINDS.map((kind) => (
              <div key={kind}>
                <dt className="font-mono text-xs tracking-[0.3em] text-ocean uppercase">{t(`partners.kind.${kind}`)}</dt>
                <dd className="mt-3">
                  <ul className="flex flex-wrap gap-3">
                    {partners
                      .filter((p) => p.kind === kind)
                      .map((partner) => (
                        <li key={partner.id} className="rounded-full border border-cobalt/25 bg-paper px-4 py-2">
                          <PartnerMark partner={partner} locale={locale} />
                        </li>
                      ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="mou-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="mou-title" kicker={t('mou.kicker')} title={t('mou.title')} body={t('mou.date')} />
          <ol className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {(['crew', 'vcc', 'contest'] as const).map((key, index) => (
              <li key={key} className="flex gap-5 py-5">
                <span className="font-mono text-xs tracking-[0.3em] text-ocean">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-lg font-semibold break-keep text-cobalt">{t(`mou.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: network page with mentors, partners and Kakao Mobility MOU

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Contact and Join pages

Read `.claude/skills/impeccable/reference/craft-floor.md` before editing UI.

**Files:**
- Modify: `src/app/[locale]/contact/page.tsx`, `src/app/[locale]/join/page.tsx`
- Test: `e2e/contact-join.spec.ts`

- [ ] **Step 1: Write the failing tests**

`e2e/contact-join.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('contact offers email and a prefilled partnership mail', async ({ page }) => {
  await page.goto('/ko/contact');
  await expect(page.getByRole('link', { name: 'risecrew4@gmail.com' }).first()).toHaveAttribute(
    'href',
    'mailto:risecrew4@gmail.com',
  );
  const partner = page.getByRole('link', { name: '제휴 문의' }).last();
  await expect(partner).toHaveAttribute('href', /^mailto:risecrew4@gmail\.com\?subject=/);
});

test('join shows closed status, eligibility, benefits and an expandable FAQ', async ({ page }) => {
  await page.goto('/en/join');
  await expect(page.getByText('Not recruiting right now')).toBeVisible();
  await expect(page.locator('[data-benefit]')).toHaveCount(7);
  const item = page.locator('details', { hasText: 'Can students from other universities or graduates join?' });
  await expect(item).not.toHaveAttribute('open', '');
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(item.locator('p')).toBeVisible();
});
```

Run: `pnpm build && pnpm e2e e2e/contact-join.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement Contact**

Replace `src/app/[locale]/contact/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import { localizedAlternates } from '@/lib/metadata';
import { toMrz } from '@/lib/passport';

const EMAIL = 'risecrew4@gmail.com';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.contact' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '/contact') };
}

export default async function ContactPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Contact');
  const footer = await getTranslations('Footer');
  const cta = await getTranslations('Cta');
  const partnerHref = `mailto:${EMAIL}?subject=${encodeURIComponent(t('partnerSubject'))}`;

  return (
    <main id="main">
      <PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />
      <section aria-labelledby="contact-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <DataPage mrz={toMrz(['RISE CREW', 'SEOUL', 'KOR'])}>
            <DataField label={FIELD.email} wide>
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
                {EMAIL}
              </a>
            </DataField>
            <DataField label={FIELD.address} wide>
              {footer('address')}
              <span className="mt-1 block text-base font-normal text-ink-soft">{t('room')}</span>
            </DataField>
          </DataPage>
          <div>
            <SectionHeading id="contact-title" kicker="PARTNERSHIP" title={t('partnerTitle')} body={t('partnerBody')} />
            <a
              href={partnerHref}
              className="mt-8 inline-block rounded bg-cobalt px-6 py-4 font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {cta('partner')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Implement Join**

Replace `src/app/[locale]/join/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import { applyCta, getBenefits, getFaqs, getRecruitment, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.join' });
  return { title: t('title'), description: t('description'), alternates: localizedAlternates(locale, '/join') };
}

export default async function JoinPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Join');
  const [recruitment, benefits, faqs] = await Promise.all([getRecruitment(), getBenefits(), getFaqs()]);
  const cta = applyCta(recruitment);

  return (
    <main id="main">
      <PageCover kicker={t('kicker')} title={t('title')} lead={t('lead')} />

      <section aria-labelledby="status-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-20 md:px-10 md:py-24 lg:grid-cols-[1fr_auto]">
          <DataPage>
            <DataField label={FIELD.status} wide>
              <span id="status-title">{t(`status.${recruitment.status}`)}</span>
            </DataField>
            {recruitment.status === 'open' ? (
              <DataField label={FIELD.period} wide>
                {pick(recruitment.period, locale)}
              </DataField>
            ) : null}
            {recruitment.nextNotice ? (
              <DataField label={FIELD.goal} wide>
                <span className="text-base font-normal text-ink">{pick(recruitment.nextNotice, locale)}</span>
              </DataField>
            ) : null}
          </DataPage>
          {cta.kind === 'apply' ? <BoardingPass cta={cta} /> : null}
        </div>
      </section>

      <section aria-labelledby="eligibility-title" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="eligibility-title" kicker="ELIGIBILITY" title={t('eligibility.title')} />
          <ul className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {(['campus', 'types', 'others'] as const).map((key) => (
              <li key={key} className="py-5 text-lg break-keep text-ink">
                {t(`eligibility.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="benefits-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="benefits-title" kicker="BENEFITS" title={t('benefits.title')} />
          <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <li key={benefit.id} data-benefit className="rounded-lg border border-paper-edge bg-white p-6">
                <p className="font-mono text-xs tracking-[0.3em] text-ocean">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 font-display text-xl font-[800] break-keep text-cobalt">{pick(benefit.title, locale)}</h3>
                <p className="mt-2 break-keep text-ink-soft">{pick(benefit.body, locale)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="faq-title" kicker="FAQ" title={t('faq.title')} />
          <ul className="mt-10 divide-y divide-paper-edge border-y border-paper-edge">
            {faqs.map((faq) => (
              <li key={faq.id}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold break-keep text-cobalt [&::-webkit-details-marker]:hidden">
                    {pick(faq.question, locale)}
                    <span aria-hidden className="font-mono text-ocean transition-transform duration-200 ease-out group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 break-keep text-ink-soft">{pick(faq.answer, locale)}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: contact and join pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: SEO (sitemap, robots, Open Graph image)

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/[locale]/opengraph-image.tsx`
- Test: `e2e/seo.spec.ts`

- [ ] **Step 1: Write the failing test**

`e2e/seo.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('pages declare hreflang alternates and a canonical URL', async ({ page }) => {
  await page.goto('/en/about');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute('href', /\/ko\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', /\/ko\/about$/);
});

test('sitemap lists every page in both languages and robots points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/ko', '/en', '/ko/about', '/en/join']) expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap.match(/<url>/g)).toHaveLength(10);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap:');
});

test('Open Graph image renders', async ({ request }) => {
  const response = await request.get('/ko/opengraph-image');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});
```

Run: `pnpm build && pnpm e2e e2e/seo.spec.ts`
Expected: FAIL (no sitemap, robots or OG image).

- [ ] **Step 2: Implement**

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/locales';
import { PAGE_PATHS } from '@/lib/metadata';
import { getSiteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return PAGE_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: new URL(`/${locale}${path}`, base).toString(),
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, new URL(`/${l}${path}`, base).toString()])),
      },
    })),
  );
}
```

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', getSiteUrl()).toString(),
  };
}
```

`src/app/[locale]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RISE CREW, the startup club of Sungkyunkwan University';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#003e91',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, opacity: 0.85 }}>SUNGKYUNKWAN UNIVERSITY</div>
        <div style={{ fontSize: 132, fontWeight: 800, marginTop: 12 }}>RISE CREW</div>
        <div style={{ fontSize: 36, marginTop: 24, color: '#9fc952' }}>Reach · Ignite · Scale up · Elevate</div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm e2e
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: sitemap, robots and Open Graph image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: CI, docs, and the pull request

**Files:**
- Create: `.github/workflows/ci.yml`, `CONTRIBUTING.md`
- Modify: `README.md`, `.gitignore`

- [ ] **Step 1: Ignore impeccable review captures**

Append to `.gitignore`:

```
# impeccable review screenshots (regenerated per review)
.impeccable/review/
.impeccable/build/
.impeccable/questions/
```

- [ ] **Step 2: CI workflow**

Check the latest major versions first and use them if newer than below:

```bash
for r in actions/checkout actions/setup-node pnpm/action-setup actions/upload-artifact; do echo "$r $(gh api repos/$r/releases/latest --jq .tag_name)"; done
```

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

- [ ] **Step 3: README**

Replace the "개발 환경" section of `README.md` (keep the 보안 규칙 section) with:

````markdown
## 개발 환경

- Node.js 24 (`.nvmrc`, fnm 사용 시 폴더에 들어가면 자동 전환)
- pnpm

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev            # http://localhost:3000 → /ko 로 이동
```

## 검사

```bash
pnpm lint && pnpm typecheck && pnpm format:check
pnpm test           # 데이터 검사, 단위 테스트
pnpm build && pnpm e2e   # 화면·접근성 확인 (빌드 후 실행)
```

PR을 올리면 GitHub Actions가 위 검사를 전부 실행합니다.

## 구조

- `src/app/[locale]/`: 페이지 (`/ko`, `/en`)
- `src/content/data/`: 사이트 콘텐츠 데이터. 형식은 `src/content/schema.ts`가 검사합니다
- `messages/ko.json`, `messages/en.json`: 버튼, 메뉴, 제목 문구
- `src/components/passport/`: 여권 디자인 컴포넌트
- 설계 문서: `docs/superpowers/specs/`, 디자인 방향: `.impeccable/surfaces/`, 디자인 규칙: `DESIGN.md`
````

- [ ] **Step 4: CONTRIBUTING**

`CONTRIBUTING.md`:

```markdown
# 기여 가이드

## 브랜치와 PR

- `main`에 직접 push하지 않습니다. `feat/...`, `fix/...`, `docs/...` 브랜치에서 작업하고 PR을 올립니다.
- PR은 리뷰 승인 1명과 CI 통과가 있어야 merge할 수 있습니다.
- PR마다 Vercel 미리보기 주소가 생깁니다. 리뷰할 때 화면을 직접 확인해 주세요.
- 커밋 메시지는 `feat:`, `fix:`, `docs:`, `chore:` 형식을 씁니다.

## 권한

- 팀원은 collaborator(write) 권한입니다. push, 브랜치, PR, 리뷰, merge를 할 수 있습니다.
- repo 설정, 브랜치 보호, Secrets, Vercel 연동처럼 소유자 권한이 필요한 작업은 동아리 공용 `risecrew` 계정으로 합니다.

## Claude Code를 쓰는 경우

- `CLAUDE.md`의 규칙(보안, 디자인 스킬 역할 분담)을 따릅니다.
- 처음 clone한 뒤 Claude Code에서 `/impeccable hooks on`을 한 번 실행합니다.

## 콘텐츠 수정

- 콘텐츠는 `src/content/data/`에 있습니다. 모든 문구는 `{ ko, en }` 두 언어가 필요합니다.
- 실제로 진행된 일정(`status: 'done'`)에는 근거(`evidence`)가 하나 이상 있어야 합니다.
- 숫자(`stats.ts`)에는 기준(`basis`)이 있어야 합니다.
- 파트너 로고는 사용 허락을 받은 뒤 `logo`와 `logoApproved: true`를 함께 넣습니다.
- 운영진 이름과 사진은 게시 동의를 받은 뒤 `consent: true`와 함께 넣습니다.
- 규칙을 어기면 `pnpm test`와 `pnpm build`가 실패합니다.

## 확인이 필요한 콘텐츠

- 멘토 영문 이름은 국립국어원 로마자 표기법으로 적었습니다. 본인이 쓰는 영문 표기를 받아 고쳐야 합니다.
- 날짜가 없는 도장(TECHFEST 베트남, SMU 바이브코딩, 카카오모빌리티 워크숍)의 날짜
- 2026 하반기 예정 일정의 진행 여부
- 공식 인스타그램 계정, 지원 링크, 운영진 게시 동의, 파트너 로고 사용 허락
```

- [ ] **Step 5: Final local check, push, PR**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm e2e
git add -A
git commit -m "ci: verify workflow; docs: README and CONTRIBUTING

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin phase1-foundation
gh pr create --base main --head phase1-foundation --title "Phase 1: foundation + public pages" --body "$(cat <<'EOF'
## Summary
- Next.js 16 + next-intl (`/ko`, `/en`), passport design system, five public pages
- Validated content data (evidence, consent and logo approval rules)
- Unit, e2e and accessibility tests; CI workflow

Spec: docs/superpowers/specs/2026-10-03-phase1-foundation-public-pages-design.md
Plan: docs/superpowers/plans/2026-10-03-phase1-foundation-public-pages.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: the PR is created and the `verify` check starts. Ask the user before pushing (the repo is public) and before creating the PR.

---

### Task 14: Deploy to Vercel and protect `main`

**Files:** none (account and repository settings)

- [ ] **Step 1: User connects Vercel (manual, needs the `risecrew` login)**

Ask the user to:

1. Open https://vercel.com/signup, choose "Continue with GitHub", and sign in as `risecrew` (use a private browser window if the personal account is logged in).
2. Import `risecrew/rise-crew-web`. Framework: Next.js (auto). Leave build settings as detected.
3. Deploy. Copy the production URL (for example `https://rise-crew-web.vercel.app`).

- [ ] **Step 2: Confirm previews**

After Vercel is connected, the open PR gets a preview comment. Open it and spot-check `/ko`, `/en/network`, `/ko/join` on desktop and phone.

Then measure the spec's performance target: run https://pagespeed.web.dev on the preview `/ko` URL with the mobile profile and record LCP. If LCP is above 2.5 s, report the largest contributors (usually fonts or the cover) to the user before merging.

- [ ] **Step 3: Merge after CI passes and a teammate approves**

The PR needs one teammate approval (`sjhbread` or `nnaeunn24`).

- [ ] **Step 4: Turn on branch protection**

Run as `risecrew` (check `gh auth status` shows `risecrew` active), after the `verify` check has run at least once:

```bash
gh api -X PUT repos/risecrew/rise-crew-web/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["verify"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1, "dismiss_stale_reviews": true },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
gh api repos/risecrew/rise-crew-web/branches/main/protection --jq '{checks: .required_status_checks.contexts, reviews: .required_pull_request_reviews.required_approving_review_count, admins: .enforce_admins.enabled}'
```

Expected: `{"checks":["verify"],"reviews":1,"admins":true}`.

---

### Task 15: Impeccable finish review and DESIGN.md

Follow `.claude/skills/impeccable/reference/new-work.md` section 7. This is the FINISH line of the home direction contract.

**Files:**
- Create: `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png` (ignored by git), `DESIGN.md`, `.impeccable/design.json`

- [ ] **Step 1: Capture valid screenshots**

On a new branch `phase1-finish` from `main`, run `pnpm build && pnpm start --port 3100`, then capture full-page screenshots of `/ko` at 1440px (`desktop.png`) and 390px (`mobile.png`) into `.impeccable/review/`, with reduced motion so every stamp is visible. Open each file and confirm it shows the whole page with no blank regions.

- [ ] **Step 2: Run the detector once**

```bash
.claude/skills/impeccable/scripts/impeccable detect --json src/app src/components
```

Fix purely mechanical findings in one batch. Keep the rest for the reviewer.

- [ ] **Step 3: Finish review**

Spawn the `impeccable-finish-reviewer` agent fresh (no conversation history) with: the original request (RISE CREW home, passport direction), the confirmed answers (logo colors are the main colors; slogan and scroll motion required; real photos to come), the artifact path `src/app/[locale]/page.tsx`, both screenshot paths, the direction contract `.impeccable/surfaces/src-app-locale-page-tsx.md`, detector findings, `.claude/skills/impeccable/reference/craft-floor.md`, and the note that this is a code-led build with no approved comp. Act on its disposition (`ship`, `fix`, `rebuild`, `recapture`) exactly as new-work section 7 describes, with at most two fix rounds.

- [ ] **Step 4: Document the design system**

Spawn `impeccable-documenter` with the project root, the artifact path, the direction contract, `PRODUCT.md`, and `.claude/skills/impeccable/reference/document.md`. Verify that `DESIGN.md` and `.impeccable/design.json` exist and carry tokens (colors, type, spacing), not prose only.

- [ ] **Step 5: PR**

```bash
git add DESIGN.md .impeccable/design.json src
git commit -m "docs: DESIGN.md from the finished passport build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Ask the user before pushing, then push and open a PR. Report the reviewer's verdict word and scope to the user exactly as returned.

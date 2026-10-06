# 1단계 설계: 기반 + 공개 페이지

- 작성일: 2026-10-03
- 상태: 사용자 검토 대기
- 관련 문서: [`PRODUCT.md`](../../../PRODUCT.md), [`CLAUDE.md`](../../../CLAUDE.md), 홈 방향 계약 [`.impeccable/surfaces/src-app-locale-page-tsx.md`](../../../.impeccable/surfaces/src-app-locale-page-tsx.md)

## 1. 목표

RISE CREW 공식 홈페이지의 기반을 만들고, 기존 사이트(https://www.iv-lab.com/)를 대체할 수 있는 공개 페이지를 한국어와 영어로 완성한다.

1단계가 끝나면 다음이 가능해야 한다.

- 방문자가 홈, About, Network, Contact, Join 페이지를 `/ko`, `/en`에서 볼 수 있다.
- 기관·파트너는 근거(사업단, MOU, 숫자, 언론 보도)를 보고 신뢰할 수 있고, 학생은 지원 방법을 알 수 있다.
- 팀원이 PR을 올리면 CI가 검사하고, 미리보기 주소에서 화면을 확인한 뒤 merge하면 자동 배포된다.
- 2단계에서 데이터 출처를 Supabase로 바꿀 때 페이지 코드를 거의 고치지 않아도 된다.

## 2. 전체 로드맵에서의 위치

| 단계 | 내용 |
|---|---|
| **1 (이 문서)** | 기반, 다국어, 디자인 시스템, 홈·About·Network·Contact·Join (정적 데이터) |
| 2 | Supabase 도입, 운영진 관리 화면, 멘토·파트너·소식 데이터를 DB로 이전, 홈 "최근 소식"과 숫자 자동화 |
| 3 | Startups: 팀 목록과 필터, 팀 상세, 팀 로그인과 자기 팀만 수정하는 권한 |
| 4 | Archive & News 필터, Network 상세(MOU 기업 상세 페이지) |
| 5 | Contact 제휴 문의 폼(저장과 알림), Join 모집 기능 |

## 3. 범위

### 포함

- Next.js 프로젝트 초기 설정, 다국어 라우팅
- 디자인 시스템(색 토큰, 글꼴, 여권 컴포넌트)
- 페이지 5개: 홈, About, Network, Contact, Join (각 한국어/영어)
- 정적 콘텐츠 데이터와 데이터 검사
- 테스트, CI, 브랜치 보호, Vercel 배포
- `README.md`, `CONTRIBUTING.md`
- 홈 디자인 마무리 리뷰와 `DESIGN.md`

### 제외 (이후 단계)

- DB, 로그인, 관리자 화면
- Startups, Archive 페이지 (메뉴에서도 숨긴다)
- 문의 폼 (1단계는 메일 링크로 대체)
- 방문자 분석 도구
- 사용자 지정 도메인 연결 (1단계는 `*.vercel.app` 주소)

## 4. 기술 스택

- Next.js (App Router, 설정 시점의 최신 안정 버전), React, TypeScript strict
- Tailwind CSS, shadcn/ui (Base UI 버전)
- next-intl (다국어)
- zod (데이터 검사)
- Vitest (단위 테스트), Playwright + @axe-core/playwright (화면·접근성 확인)
- ESLint, Prettier, `.editorconfig`
- pnpm, Node.js 24 (`.nvmrc`)
- Vercel (Hobby 플랜)

## 5. 페이지 구조와 다국어

### 경로

| 경로 | 페이지 |
|---|---|
| `/` | 브라우저 언어를 보고 `/ko` 또는 `/en`으로 이동. 판단할 수 없으면 `/ko` |
| `/[locale]` | 홈 |
| `/[locale]/about` | About |
| `/[locale]/network` | Network |
| `/[locale]/contact` | Contact |
| `/[locale]/join` | Join |

- `locale`은 `ko`, `en` 두 가지다.
- 언어를 전환하면 같은 페이지의 다른 언어판으로 이동한다(`/ko/about` ↔ `/en/about`).
- 메뉴: 홈, About, Network, Contact, 그리고 강조된 Join 버튼. Startups와 Archive는 해당 단계가 끝날 때까지 메뉴에 넣지 않는다.

### 문구 관리

- 버튼, 메뉴, 제목 같은 UI 문구: `messages/ko.json`, `messages/en.json`
- 콘텐츠(멘토, 도장, 프로그램 등): `src/content/` 데이터 파일 (6절)

### 검색엔진

- 언어별 `title`, `description`, Open Graph 이미지
- `hreflang`으로 서로의 다른 언어판 주소를 알림
- `sitemap.xml`, `robots.txt`

## 6. 콘텐츠 데이터

### 구조

```
src/content/         1단계 데이터 파일 (2단계에서 Supabase로 교체)
src/content/schema.ts  zod 스키마와 타입
src/lib/content.ts   getStats(), getStamps(), getMentors() 등. 페이지는 이 함수만 부른다
```

- `src/lib/content.ts`의 함수는 처음부터 `async`로 만든다. 2단계에서는 함수 내부만 Supabase 호출로 바꾼다.
- 모든 문구는 `{ ko: string; en: string }` 형태로 저장하고, 1단계에서는 두 언어 모두 필수다.

### 데이터 종류

| 종류 | 필드 | 규칙 |
|---|---|---|
| Stat | `value`, `label`, `basis` | `basis`(기준, 예: "2026.01 기준") 필수 |
| Stamp | `date`, `city`, `country`, `title`, `stage`(`campus`·`domestic`·`global`), `status`(`done`·`planned`), `evidence[]` | `done`이면 `evidence` 1개 이상 필수 |
| Program | `name`, `summary`, `details[]`, `stage` | |
| Mentor | `name`, `org`, `role`, `expertise[]`, `featured`, `photo?` | 이름과 소속은 기존 사이트에 공개된 내용을 쓴다. `photo`는 게시 동의를 받은 경우에만 넣는다 |
| Partner | `name`, `kind`(지원 기관·기업·대학·프로그램), `url?`, `logo?`, `logoApproved` | `logoApproved`가 `false`면 로고 대신 이름을 글자로 표시한다 |
| Officer | `role`, `name?`, `photo?`, `consent` | `consent`가 `false`면 직책만 표시한다 |
| Press | `outlet`, `date`, `title`, `url` | |
| Faq | `question`, `answer` | OT 자료 기반 |
| Recruitment | `status`(`open`·`closed`), `period?`, `applyUrl?`, `nextNotice` | 홈과 Join의 지원 버튼이 이 값에 따라 바뀐다 |

### 데이터 검사 (빌드 실패 조건)

- 한국어나 영어 문구가 비어 있다.
- `done` 도장에 근거가 없다.
- 숫자에 기준이 없다.
- `logoApproved: false`인 파트너의 로고가 노출되도록 설정되어 있다.
- `consent: false`인 운영진의 이름이나 사진이 노출되도록 설정되어 있다.

### 초기 데이터 출처

`PRODUCT.md`의 Evidence on Hand와 참고자료 폴더(소개서, 사업단 소개서, OT 자료, 기존 사이트)에서 옮긴다. 자료에 없는 사실은 만들지 않는다. 2026 하반기 일정은 진행 여부가 확인될 때까지 `planned`로 둔다.

## 7. 페이지별 내용

### 홈

방향과 첫 화면 구성은 홈 방향 계약(`.impeccable/surfaces/src-app-locale-page-tsx.md`)을 따른다. 섹션 순서:

1. 여권 표지: R 엠블럼, R·I·S·E 슬로건, 신원 면의 숫자(90+ 멤버, 22+ 팀, 멘토 33명, 각 기준 표시), 지원하기(탑승권)와 제휴 문의
2. 신원 면: RISE CREW 소개, 지원 기관(ANCHOR 사업단), 카카오모빌리티 MOU
3. 경로: Campus → Domestic → Global 도장과 단계별 프로그램
4. 글로벌: 다녀온 도시 도장(완료)과 예정 일정(빈 점선 도장)
5. 네트워크 미리보기: 멘토 수, 대표 멘토, 파트너
6. 언론 보도
7. 탑승권: 지원하기, 제휴 문의

### About

- 소개와 비전: 슬로건, R·I·S·E의 뜻, Born to Global
- 지원 기관: ANCHOR 사업단 소개(SOUL·MATE, KPI). 동아리가 주인공이고 사업단은 지원 기관으로 소개한다
- 프로그램: 5 Step 육성 플랜, VCC(5개 트랙, 18회차), 성창재, Learner/Preneur(SPEC 협력)
- 운영진과 지도교수 (게시 동의 규칙 적용)
- 연혁: 도장 타임라인(2025 1기 → 2026 2기)

### Network

- 멘토: 전체 인원(33명)을 숫자로 보여주고, 이름이 공개된 멘토(기존 사이트 기준 19명)를 목록으로 보여준다. 대표 멘토 먼저, 소속과 전문 분야 포함
- 협력 기관과 기업
- 카카오모빌리티 MOU: 협약일, 협력 프로그램 3가지

### Contact

- 공용 이메일 `risecrew4@gmail.com`, 인스타그램(확정 후), 동아리방 위치(호암관 50322호)
- 제휴 문의: 제목이 미리 채워진 메일 링크 (폼은 5단계)

### Join

- 모집 상태와 기간, 지원 링크 (모집 상태 데이터에 따라 표시)
- 지원 자격: 인사캠, 자과캠, 타교생, 졸업생 (조건 포함)
- 받을 수 있는 것: 혜택 7가지
- FAQ
- 모집 기간이 아니면 다음 모집 안내를 보여준다

## 8. 디자인 시스템

### 방향

홈 방향 계약의 "RISE CREW 여권" 세계를 사이트 전체에 적용한다. 방향 계약 문장은 소스 코드, 주석, 화면에 복사하지 않는다(impeccable 규칙).

### 색

`PRODUCT.md`의 로고 색을 따른다. 로고에 없는 색을 메인으로 쓰지 않는다.

| 역할 | 값(근사) | 쓰임 |
|---|---|---|
| 코발트 블루 | `#003E91` | 여권 표지, 주요 글자, 기본 버튼 |
| 심볼 그라데이션 | `#9FC952` → `#49B67E` → `#10A1C7` → `#0DBEDB` → `#0175BA` | 길로셰 무늬, 도장, 스크롤 진행 색 |
| 보안 용지 | 그라데이션 계열의 아주 옅은 색 | 속지 배경 |

- 본문 글자는 WCAG AA 대비를 지킨다. 흰 글자와 코발트 블루의 대비는 약 10:1이다.
- 최종 토큰은 홈 완성 후 `DESIGN.md`에서 확정한다.

### 글꼴

- 본문, 슬로건용 디스플레이, MRZ용 고정폭 세 종류. 모두 한글과 영문을 지원하거나 짝을 맞춘다.
- 구체적인 글꼴은 구현 중 impeccable `typeset`으로 화면에서 비교해 정한다. impeccable이 금지 목록으로 두는 흔한 글꼴(Outfit 등)은 쓰지 않는다.
- 한글 글꼴은 서브셋으로 나눠 불러온다.

### 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `PassportCover` | 홈 첫 화면 표지 |
| `DataPage`, `DataField` | 한글/영문 짝 라벨 정보 칸 |
| `Stamp` | 도장. `done`(찍힘), `planned`(빈 점선). 근거 링크 연결 |
| `Guilloche` | 코드로 그리는 SVG 보안 무늬. 색은 CSS 변수로 제어 |
| `MRZLine` | 여권 판독 줄 장식. `aria-hidden` |
| `BoardingPass` | 지원하기 버튼. 절취선, 눌리는 깊이 |
| `SiteHeader`, `SiteFooter`, `LocaleSwitch` | 공통 머리말, 꼬리말, 언어 전환 |

- shadcn/ui는 동작(모바일 메뉴, FAQ 펼치기, 툴팁)만 쓰고 겉모습은 여권 문법으로 다시 입힌다.

### 로고

- `public/brand/rise-crew-lockup.svg`: 컬러 가로형
- `public/brand/rise-crew-symbol-mono.svg`: 단색 심볼(`currentColor`), 표지 엠보싱용

### 움직임

- CSS 우선. 스크롤 진행에 따라 길로셰 색이 이동하고(CSS 스크롤 기반 애니메이션, 미지원 브라우저는 정적 색), 도장은 화면에 들어올 때 한 번 찍힌다.
- 스크롤을 가로채지 않는다. `transform`과 `opacity`만 애니메이션한다.
- `prefers-reduced-motion`이면 도장은 바로 보이고, 색 이동은 섹션별 정적 색으로 바뀐다.
- 모션 규칙은 Emil 스킬을 따른다. Motion 라이브러리는 CSS로 안 되는 경우에만 추가한다.

### 이미지

- Next.js `Image`로 최적화한다.
- 사진 원본이 오기 전에는 자리 표시 이미지에 "임시" 표기를 한다.
- 파트너 로고는 사용 허락 후에만 넣고, 카카오모빌리티 로고는 CI 가이드라인대로 원본 그대로 흰 바탕에 둔다.

## 9. 디렉터리 구조

```
src/
  app/[locale]/
    layout.tsx
    page.tsx              홈
    about/page.tsx
    network/page.tsx
    contact/page.tsx
    join/page.tsx
  components/
    passport/             여권 컴포넌트
    site/                 헤더, 푸터, 언어 전환
    ui/                   shadcn 컴포넌트
  content/                데이터 파일, schema.ts
  i18n/                   next-intl 설정, 라우팅
  lib/content.ts          데이터 접근 함수
messages/ko.json, en.json
public/brand/             로고
tests/                    Vitest 데이터 검사
e2e/                      Playwright
```

## 10. 품질 관리

### 테스트

| 종류 | 도구 | 검사 |
|---|---|---|
| 데이터 검사 | Vitest + zod | 6절의 빌드 실패 조건 |
| 화면 확인 | Playwright | 5개 페이지 × 2개 언어가 열린다, 언어 전환이 같은 페이지를 유지한다, 콘솔 오류가 없다. 데스크톱(1440)과 모바일(390) |
| 접근성 | @axe-core/playwright | 위 페이지 전부에서 심각(serious, critical) 위반 0개 |

### CI

GitHub Actions, PR과 `main` push마다 실행:

```
pnpm install → lint → typecheck → test(데이터 검사) → build → e2e(화면·접근성)
```

### 브랜치 보호

CI가 처음 통과한 직후 `main`에 설정한다.

- PR로만 변경, 리뷰 승인 1명 이상, CI 통과 필수
- 강제 push 금지
- 설정은 소유자 권한이 필요해서 `risecrew` 계정으로 한다

### 성능

- 모바일 LCP 2.5초 이내
- 한글 글꼴 서브셋, 이미지 최적화

## 11. 배포

- Vercel Hobby. `risecrew` 계정으로 가입하고 GitHub repo를 연결한다(사용자가 직접).
- `main` merge → 실제 사이트 배포, PR → 미리보기 주소
- 1단계는 비밀키가 없다. Supabase 키는 2단계에서 Vercel 환경변수에 등록한다.
- 도메인: 미정. 1단계는 `*.vercel.app` 주소를 쓴다. 후보는 기존 `iv-lab.com`, 새 도메인 구매, 학교 하위 도메인.
- Vercel Hobby는 비상업적 용도 전용이다. 유료 판매나 광고 수익이 생기면 Pro로 바꿔야 한다.

## 12. 문서

- `README.md`: 설치, 실행, 테스트 방법
- `CONTRIBUTING.md`: 브랜치·PR 규칙, 권한 안내(소유자 작업은 `risecrew` 계정), `/impeccable hooks on` 설정, 콘텐츠 데이터 추가 방법
- `DESIGN.md`: 홈 완성 후 impeccable 문서화 단계에서 작성

## 13. 완료 기준

- 5개 페이지 × 2개 언어가 Vercel 주소에서 열린다.
- CI 전체 통과, 접근성 심각 위반 0개
- 홈이 방향 계약대로 만들어지고, impeccable 마무리 리뷰 결과(verdict)와 `DESIGN.md`가 있다.
- 브랜치 보호가 켜져 있다.
- `README.md`, `CONTRIBUTING.md`가 있다.

## 14. 미정 사항

운영진 확인이 필요하다. 확정 전에는 아래 기본 처리로 진행한다.

| 항목 | 확정 전 처리 |
|---|---|
| 공식 인스타그램 계정 (`@skku_rise` / `@skku_anchor`) | Contact와 푸터에서 인스타그램을 빼고 이메일만 표시 |
| 지원 링크(구글 폼 등) | 모집 상태 `closed`, 다음 모집 안내 표시 |
| 사진 원본 | "임시" 표기한 자리 표시 이미지 |
| 운영진·지도교수 게시 동의 | 직책만 표시 |
| 카카오모빌리티 등 파트너 로고 사용 허락 | 로고 대신 이름을 글자로 표시 |
| 2026 하반기 일정 진행 여부 | 예정(빈 점선 도장) |
| AI+X 대상 팀 표기 ("SL:IT (슬릿)" / "SL:IT (ANYON)") | "SL:IT"로만 표기 |
| 도메인 | `*.vercel.app` |

## 15. 구현 계획에서 확정한 변경

- shadcn/ui 도입은 2단계(관리자 화면)로 미룬다. 1단계의 모바일 메뉴와 FAQ는 브라우저 기본 요소 `<details>`로 만든다. JavaScript 없이도 동작하고 의존성이 줄어든다.
- 길로셰 무늬는 페이지마다 SVG를 반복해서 넣지 않고, `/patterns/{blue,teal,green,white}.svg` 정적 경로로 한 번만 만들어 CSS 배경으로 쓴다.
- 데이터 종류에 `GrowthStep`(5단계 육성 플랜)과 `Benefit`(지원자 혜택)을 추가한다.
- 이름이 공개된 멘토는 기존 사이트 기준 19명이다(7절의 "20명"을 정정).
- 지난 날짜의 예정 일정은 "예정"이 아니라 "확인 중"으로 표시한다.

## 16. 디자인 방향 변경 (2026-10-03)

사용자가 여권 방향으로 만든 결과물을 보고 "스크롤 움직임이 부족하고 사진이 없다"고 판단해, 디자인 방향을 다시 골랐다. 8절의 여권 세계(길로셰, 도장, MRZ, 탑승권)는 폐기하고 아래로 대체한다. 페이지 구조, 데이터, 다국어, 품질 관리 등 나머지 절은 그대로 유효하다.

- **방향**: 데모데이 무대. 홈은 고정 화면에서 스크롤에 따라 슬라이드 11장이 넘어가는 발표 형식이다. 방향 계약은 `.impeccable/surfaces/src-app-locale-page-tsx.md`에 있다.
- **고정 조건(사용자 확정)**: 실제 사진이 주인공, 고정 화면 장면 전환(apple.com/airpods-pro 참고), 사진 위 거대한 숫자(speedrun.a16z.com 참고).
- **사진**: 원본이 올 때까지 동아리 소개서에서 추출한 사진 5장을 "임시" 표시와 함께 쓴다(`public/images/temp/`, 출처 정보 내장). 신문사 사진과 멘토 얼굴 사진은 쓰지 않는다.
- **움직임**: Motion 라이브러리로 장면 고정·축소·어두워짐, 카운트업, 굵기 변화를 구현한다. JavaScript가 없으면 고정 장면이 그대로 쌓이며 읽히고, 움직임 줄이기 설정이면 최종 상태를 바로 보여준다.
- **안쪽 페이지**: 어두운 무대 바탕에 큰 제목과 사진 스크린(표지), 얇은 구분선의 정보 목록. About의 연혁은 도장 대신 날짜별 일정표(Timeline)다.
- **색**: 무대 바탕 `#07090f`(무채색)를 추가했다. 주 색은 여전히 로고의 코발트와 라임이다.

## 17. 홈 구조 변경 (2026-10-06)

사용자가 데모데이 무대 홈을 보고 "카드뉴스처럼 1~11페이지를 내려가는 느낌이라 한 사이트 같지 않다"고 판단했다. 무대 분위기(16절의 색, 사진, 거대한 숫자)는 유지하고 홈 구조만 바꾼다. 안쪽 페이지는 이번 변경에 포함하지 않는다.

- **선택 과정**: 구조 시안 3개(세 단계 레일, 한 줄의 항로, 사진 벽)를 실제 페이지로 만들어 비교했고 사용자가 세 단계 레일을 골랐다.
- **구조**: 첫 화면(사진 + 슬로건) → 숫자 → Campus → Domestic → Global → 지원하기. 세 장(章)을 지나는 동안 단계 레일이 위치를 보여준다. 방향 계약은 `.impeccable/surfaces/src-app-locale-page-tsx.md`에 있다.
- **고정 장면**: 첫 화면과 Global 갤러리 두 곳만 화면을 고정한다. 나머지는 일반 스크롤이다. 16:9 스크린 틀, 슬라이드 번호, 발표 진행 표시는 없앤다.
- **사용자 피드백 반영**: 스크롤 방향과 다른 방향(가로)으로 움직이지 않는다. 글이 계속 흘러가면 읽기 어려우므로 Global은 바뀐 뒤 멈춰 있고, 가까운 도시에 맞춰진다.
- **JavaScript 없음 / 움직임 줄이기**: 모든 내용이 세로로 읽힌다. 숫자는 최종값으로 보인다.

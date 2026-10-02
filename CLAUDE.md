# RISE CREW Web

@AGENTS.md

성균관대학교 창업 동아리 **RISE CREW**의 공식 홈페이지.

- **RISE CREW**: 동아리 이름이자 이 사이트의 주인공.
- **ANCHOR 사업단**: RISE CREW를 지원하는 기관. 사이트에서는 지원 기관으로만 소개한다. 예전 자료의 "RISE 사업단" 표기는 쓰지 않는다.
- 한국어 / 영어 두 언어로 제공한다.

## 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Base UI)
- Supabase (Postgres, Auth, Storage)
- Vercel
- Node.js 24 (`.nvmrc`), pnpm

## 보안 규칙 (public repo)

- 비밀키를 커밋하지 않는다. 실제 값은 `.env.local`, Vercel, GitHub Secrets에만 둔다. repo에는 `.env.example`(변수 이름만)만 커밋한다.
- Supabase secret 키(`service_role`)는 서버 코드에서만 쓰고, `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 모든 Supabase 테이블에 RLS를 켠다.
- 지원자·회원의 개인정보(연락처, 학번 등)를 repo에 넣지 않는다. 테스트 데이터는 가짜 값을 쓴다.
- 참고자료 폴더(`RISE CREW 소개서/`, `앵커 사업단 소개서/`, `오티 자료/`, `_references/`)는 내부 자료다. 커밋하지 않는다.

## 디자인 스킬 역할 분담

`.claude/skills/`에 설치된 스킬은 아래처럼 역할을 나눈다. 충돌하면 이 표를 따른다.

| 영역 | 담당 스킬 | 비고 |
|---|---|---|
| 디자인 방향, 레이아웃, 타이포, 색, 디자인 리뷰 | `impeccable` | 디자인 기준 문서는 `DESIGN.md` 하나뿐이다. |
| 모션, 인터랙션 | `emil-design-eng`, `animate`, `review-animations`, `find-animation-opportunities` | impeccable의 `animate`, `delight`, `overdrive`와 충돌하면 Emil 스킬의 규칙을 따른다. |
| 모바일 웹 대응 | `mobile-native` | |
| 라이브러리 선택 | `pick-ui-library` | 직접 호출할 때만 동작한다. |
| 컴포넌트 | `shadcn` | |
| React / Next.js 성능 | `vercel-react-best-practices` | |

- 기능 단위 설계는 superpowers `brainstorming`, 화면 단위 UI 설계는 `impeccable shape`를 쓴다.
- 스킬 버전은 `skills-lock.json`에 고정되어 있다. impeccable은 `npx impeccable update`로 갱신한다.

## impeccable 검사 hook

impeccable은 UI 파일을 수정할 때마다 디자인 검사를 실행하는 hook을 쓴다. 공용 설정은 `.impeccable/config.json`(quiet 모드)이다.

hook은 각자의 `.claude/settings.local.json`(커밋되지 않음)에 등록된다. 처음 clone한 팀원은 Claude Code에서 아래 명령을 한 번 실행한다.

```
/impeccable hooks on
```

검사 엔진은 처음 실행할 때 `github.com/pbakaus/impeccable` 릴리스에서 자동으로 내려받고 sha256으로 검증한다.

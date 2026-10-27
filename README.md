# RISE CREW Web

RISE CREW 창업 동아리 공식 홈페이지.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS (shadcn/ui는 2단계 관리자 화면에서 도입)
- Supabase (Postgres, Auth, Storage)
- Vercel

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

계정·로그인 확인은 로컬 Supabase가 켜져 있어야 해서(`pnpm db:start`, Docker 필요) 따로 실행합니다. GitHub Actions에서는 돌리지 않습니다.

```bash
pnpm e2e:auth       # 로그인 링크, 세션 갱신, 로그아웃 (자체 빌드 `.next-auth`, 포트 3200)
```

## 배포 주소

- `main`에 merge하면 Vercel이 `https://rise-crew-web.vercel.app`에 배포한다. 이 주소는 **진짜 도메인을 연결하기 전까지 쓰는 임시 주소**다.
- 임시 주소는 검색엔진에 잡히지 않게 막아 둔다(`robots.txt` Disallow, 모든 페이지 `noindex`).
- 진짜 도메인을 연결할 때 Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`에 그 주소(예: `https://도메인`)를 넣고 다시 배포하면 검색 허용, canonical, sitemap 주소가 모두 그 도메인으로 바뀐다. `*.vercel.app`이나 `localhost`를 넣으면 계속 막힌 상태로 남는다.

## 구조

- `src/app/[locale]/`: 페이지 (`/ko`, `/en`)
- `src/content/data/`: 사이트 콘텐츠 데이터. 형식은 `src/content/schema.ts`가 검사합니다
- `messages/ko.json`, `messages/en.json`: 버튼, 메뉴, 제목 문구
- `src/components/home/`: 홈 구성(첫 화면, 숫자, Campus·Domestic·Global 장, 지원 안내)
- `src/components/stage/`: 무대 스타일 공용 컴포넌트(사진, 숫자 카운트업, 단계 레일, 고정 갤러리)
- `public/fonts/`: 직접 호스팅하는 글꼴(Pretendard, Wanted Sans). 패키지 버전을 올린 뒤 `pnpm fonts:vendor`로 다시 복사합니다
- 설계 문서: `docs/superpowers/specs/`, 디자인 방향: `.impeccable/surfaces/`, 디자인 규칙: `DESIGN.md`

## 보안 규칙

이 저장소는 **public**입니다.

- 비밀키(`.env*`, Supabase `service_role` 키 등)는 절대 커밋하지 않습니다. `.env.example`만 커밋합니다.
- 지원자·회원 개인정보는 저장소에 넣지 않습니다. 테스트 데이터는 가짜 값을 사용합니다.
- 키를 실수로 push했다면 파일 삭제로는 해결되지 않습니다. 즉시 해당 키를 재발급하세요.

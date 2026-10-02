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

## 구조

- `src/app/[locale]/`: 페이지 (`/ko`, `/en`)
- `src/content/data/`: 사이트 콘텐츠 데이터. 형식은 `src/content/schema.ts`가 검사합니다
- `messages/ko.json`, `messages/en.json`: 버튼, 메뉴, 제목 문구
- `src/components/passport/`: 여권 디자인 컴포넌트
- 설계 문서: `docs/superpowers/specs/`, 디자인 방향: `.impeccable/surfaces/`, 디자인 규칙: `DESIGN.md`

## 보안 규칙

이 저장소는 **public**입니다.

- 비밀키(`.env*`, Supabase `service_role` 키 등)는 절대 커밋하지 않습니다. `.env.example`만 커밋합니다.
- 지원자·회원 개인정보는 저장소에 넣지 않습니다. 테스트 데이터는 가짜 값을 사용합니다.
- 키를 실수로 push했다면 파일 삭제로는 해결되지 않습니다. 즉시 해당 키를 재발급하세요.

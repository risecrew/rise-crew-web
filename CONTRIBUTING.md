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

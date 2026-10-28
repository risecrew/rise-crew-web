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
pnpm build && pnpm e2e   # 화면·접근성 확인 (빌드 후 실행, 계정 기능은 꺼진 상태)
pnpm db:test        # DB 규칙(RLS, 권한, 동의) 테스트. 로컬 Supabase 필요
pnpm e2e:auth       # 로그인, 가입, 마이페이지, 회원 관리 (자체 빌드 `.next-auth`, 포트 3200). 로컬 Supabase 필요
```

PR을 올리면 GitHub Actions(`.github/workflows/ci.yml`)가 위 검사를 전부 실행합니다. 일은 둘로 나뉩니다.

- `verify`: `lint`, `typecheck`, `format:check`, `test`, `build`, `e2e`.
- `auth`: 실행기(runner) 안에서 로컬 Supabase를 줄인 구성으로 켜고 `pnpm db:test`와 `pnpm e2e:auth`를 실행합니다. 로컬 Supabase가 자기 키를 스스로 만들기 때문에 GitHub Secrets가 필요 없습니다.

## 로컬 Supabase

로그인과 계정 기능은 Supabase가 필요합니다. 개발과 테스트는 내 컴퓨터의 로컬 Supabase에서 합니다. **Docker가 켜져 있어야 합니다.**

```bash
pnpm db:start       # 로컬 Supabase 시작. 처음에는 이미지를 받느라 오래 걸리고, 끝나면 주소와 키가 나온다
pnpm db:stop        # 끄기
pnpm db:reset       # DB를 비우고 마이그레이션과 시드(supabase/seed.sql)를 다시 적용
pnpm db:test        # supabase/tests/database의 DB 테스트(pgTAP)
pnpm db:types       # 스키마를 바꾼 뒤 src/lib/supabase/database.types.ts를 다시 만든다
pnpm e2e:auth       # 로그인과 계정 화면 e2e (위 "검사" 참고)
```

- 메모리가 작은 컴퓨터는 필요한 것만 켜도 됩니다. `db:test`와 `e2e:auth`는 이것으로 충분하고 CI도 같은 구성을 씁니다.

  ```bash
  pnpm exec supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
  ```

- 시드 계정은 `guest@example.test`, `member@example.test`, `operator@example.test`, `admin@example.test`입니다. 역할은 앞의 이름과 같고, 모두 가짜 값이며 비밀번호가 없습니다.
- 로컬에서 보낸 로그인 메일은 실제로 나가지 않고 Mailpit(http://127.0.0.1:54324)에 쌓입니다. 로그인 화면에서 이메일 링크를 요청한 뒤 거기서 링크를 엽니다.
- **로컬에서는 구글 로그인이 설정되어 있지 않습니다.** `supabase/config.toml`에서 Google 제공자를 켜지 않았습니다(켜려면 OAuth 클라이언트의 ID와 Secret이 필요한데, 그 값은 저장소에 둘 수 없습니다). 그래서 로컬에서는 이메일 링크(Mailpit)로만 로그인할 수 있고, "구글로 계속하기"는 눌러도 로그인이 되지 않습니다. 구글 로그인은 클라우드 개발용 프로젝트의 미리보기 주소에서 확인합니다.
- 로컬 Supabase 설정은 `supabase/config.toml`, DB 변경은 `supabase/migrations/`에 있습니다. DB를 바꿀 때는 마이그레이션 파일을 새로 만들고, 권한 규칙에는 `supabase/tests/database/`에 테스트를 붙입니다.

`pnpm dev`로 계정 기능을 직접 써 보려면 `.env.example`을 `.env.local`로 복사하고 값을 채웁니다. 주소와 키는 `pnpm exec supabase status -o env`에서 `API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`를 가져오고, `NEXT_PUBLIC_AUTH_ENABLED`는 `true`로 둡니다. `.env.local`은 커밋되지 않습니다.

## 환경변수

이름은 `.env.example`에 있습니다. 실제 값은 `.env.local`(내 컴퓨터)과 Vercel 환경변수에만 둡니다.

| 이름                                   | 용도                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_AUTH_ENABLED`             | 계정 기능 스위치. 정확히 `true`일 때만 켜진다. 아래 "계정 기능 스위치" 참고                                                  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase 프로젝트 주소. 로컬은 `pnpm db:start`가 출력하는 API URL                                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키. 브라우저에 나가도 되고, 데이터는 RLS가 지킨다                                                              |
| `SUPABASE_SECRET_KEY`                  | Supabase 관리자 키. **서버 전용.** 계정 삭제, 차단, 역할 변경에 쓴다. `NEXT_PUBLIC_`을 절대 붙이지 않고, 값을 커밋하지 않는다 |
| `NEXT_PUBLIC_SITE_URL`                 | 사이트의 공개 주소. canonical, sitemap, 검색엔진 허용 여부를 정한다. 아래 "배포 주소" 참고                                   |

## 계정 기능 스위치

로그인, 가입, 마이페이지, 회원 관리는 환경변수 `NEXT_PUBLIC_AUTH_ENABLED` 하나로 켜고 끕니다.

- **꺼져 있으면** 사이트는 계정 기능이 생기기 전과 같습니다. 메뉴에 로그인이 보이지 않고, 로그인·가입·마이페이지·회원 관리 주소는 404이고, 공개 페이지는 정적입니다. 개인정보 처리방침 페이지는 확인을 받아야 하므로 꺼져 있어도 열립니다.
- **켜지는 조건**은 값이 정확히 `true`이고, `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 둘 다 있을 때입니다. 하나라도 빠지면 꺼진 것으로 동작합니다.
- 이 값은 **빌드할 때 읽힙니다.** 켜거나 끄려면 Vercel에서 값을 바꾼 뒤 **다시 배포**해야 합니다.
- 임시 주소(`vercel.app`)도 누구나 들어올 수 있어서, 켜는 순간이 실제 가입이 시작되는 순간입니다.

### Production에서 켜기

운영진과 ANCHOR 사업단 담당자가 개인정보 처리방침(`/ko/privacy`)을 확인해 **승인한 뒤에만** 켭니다. 처리방침 초안은 표준 양식에 맞춘 것이고 법률 검토가 아닙니다.

1. 승인한 날짜(`YYYY-MM-DD`)를 `src/lib/auth/profile.ts`의 `PRIVACY_POLICY_VERSION`에 넣고, `tests/lib/auth-profile.test.ts`가 가진 같은 값도 고쳐 PR로 merge한다. 이 값이 처리방침 맨 아래의 시행일이고 동의 기록에 남는 버전이다. 승인 전에 글이 바뀌는 동안은 값을 그대로 두고, 승인한 날에만 바꾼다. 켠 뒤 글을 고치면 새 날짜로 바꾼다.
2. Vercel의 **Production** 환경변수에 `NEXT_PUBLIC_AUTH_ENABLED=true` **하나만** 더한다. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`는 이 PR을 merge하기 **전에** 이미 운영용 Supabase 프로젝트의 값으로 Production에 넣어 두었어야 한다(아래 "7. Vercel 환경변수"). 스위치가 없으면 이 세 값이 있어도 계정 기능은 꺼진 채라서, merge해도 공개 사이트는 그대로다. 출시 때 새로 더하는 것은 스위치 하나뿐이다.
3. 다시 배포한다.
4. 실제 주소에서 구글 로그인과 이메일 링크 로그인이 끝까지 되는지 확인한다.

## 클라우드 Supabase 설정

새 Supabase 프로젝트(개발용이든 운영용이든)를 만들 때마다 아래를 반복합니다. 계정, 비밀번호, 대시보드 설정은 사람이 직접 합니다. **키와 비밀번호는 이 저장소, 채팅, 이슈에 붙이지 않습니다.** 순서가 중요합니다. 5번의 훅은 1번으로 올린 함수가 있어야 켤 수 있습니다.

프로젝트는 서울 리전(`ap-northeast-2`)으로 만들고, 개발용과 운영용의 보안 옵션을 같게 맞춥니다.

### 1. 연결하고 DB 올리기

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <프로젝트 ref>
pnpm exec supabase db push --dry-run   # 무엇이 올라가는지 먼저 본다
pnpm exec supabase db push
pnpm exec supabase migration list --linked   # 로컬과 원격의 목록이 같아야 한다
```

- **`--include-seed`를 절대 쓰지 않습니다.** 시드의 계정은 로컬 개발용이고, 클라우드에 들어가면 가짜 관리자 계정이 생깁니다.
- DB는 자동으로 올리지 않고 관리자가 자기 컴퓨터에서 올립니다. 자동 배포를 하려면 DB 비밀번호를 GitHub Secrets에 넣어야 해서, 쓰기 권한이 있는 협업자가 워크플로를 고쳐 빼낼 수 있기 때문입니다.
- 운영용 DB에는 PR을 merge하기 직전에 올립니다. 그래서 마이그레이션은 직전 버전의 코드와도 함께 동작하게(추가 위주로) 씁니다.

### 2. Google 계정과 OAuth 클라이언트

- **웹사이트 전용 Google 계정**을 씁니다. 동아리가 소유하는 계정이고 개인 계정이나 임원 공용 계정이 아닙니다. 2단계 인증을 켜고, 복구 이메일은 `risecrew4@gmail.com`, 백업 코드는 회장이 보관합니다. 넘겨주는 절차는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.
- 이 계정으로 Google Cloud 프로젝트를 만들고, `risecrew4@gmail.com`을 프로젝트 Owner로 추가합니다.
- OAuth 동의 화면은 사용자 유형 **External**입니다. 게시 상태가 **Testing**인 동안에는 테스트 사용자 목록에 넣은 계정만 구글 로그인을 쓸 수 있으니, 시험할 사람의 Google 계정을 목록에 더합니다. 이메일과 이름 같은 기본 정보만 쓰므로 구글 심사는 필요 없다고 봤습니다(출시 때 게시하면서 구글 화면의 안내를 다시 확인합니다).
- OAuth 클라이언트(웹 애플리케이션)를 만들고, 승인된 리디렉션 URI에 `https://<프로젝트 ref>.supabase.co/auth/v1/callback`을 넣습니다.

### 3. Supabase 구글 로그인

대시보드 Authentication의 Sign In / Providers에서 Google을 켜고 OAuth 클라이언트의 ID와 Secret을 넣습니다.

### 4. 로그인 메일: SMTP, 메일 양식, 필터

- **SMTP**: 대시보드의 SMTP 설정을 켭니다. Host `smtp.gmail.com`, Port `465`, 사용자와 보내는 사람은 웹사이트 전용 Google 계정, 비밀번호는 그 계정의 **앱 비밀번호**입니다. 앱 비밀번호는 2단계 인증을 켠 뒤 Google 계정에서 만듭니다. Gmail은 하루 발송량에 한도가 있습니다.
- **메일 양식**: Authentication의 Email Templates에서 **"Magic Link"와 "Confirm signup" 두 양식 모두** `supabase/templates/magic_link.html`의 내용으로 바꾸고, 제목은 `RISE CREW 로그인 링크 / Sign-in link`로 합니다.
- **"Confirm email"은 켠 채로 둡니다.** 로컬(`enable_confirmations = false`)과 다릅니다. 끄면 누구나 공개 키로 남의 이메일을 넣어 가입을 호출하고, 그 메일함이 없어도 세션을 받을 수 있습니다. 켜 두면 새 사람의 첫 메일은 Supabase의 "Confirm signup" 양식으로 나가므로, 이 양식도 로그인 링크와 같은 양식으로 맞춰야 첫 메일의 링크가 똑같이 동작합니다.
- **Gmail 필터**: 웹사이트 전용 Google 계정의 Gmail에 필터를 만듭니다. 보낸 사람은 그 계정 자신, 제목은 `RISE CREW 로그인 링크`, 동작은 삭제(휴지통으로 이동)입니다. 보낸 로그인 메일의 사본이 보낼 때 휴지통으로 가고, Gmail이 휴지통을 30일 뒤에 비웁니다. 개인정보 처리방침이 "사본은 30일 안에 자동으로 삭제된다"고 적고 있으니, 이 필터가 없으면 처리방침이 사실이 아닙니다.

### 5. 주소 설정과 훅

- **URL Configuration**
  - Site URL은 개발용 프로젝트는 `http://localhost:3000`, 운영용 프로젝트는 `https://rise-crew-web.vercel.app`(진짜 도메인이 생기면 교체)입니다.
  - Redirect URLs는 프로젝트마다 다릅니다.
    - **개발용 프로젝트**: `http://localhost:3000/**`와 **정확한 미리보기 주소** `https://rise-crew-web-git-<브랜치>-rise-crew1.vercel.app/**`를 하나씩 넣습니다. 브랜치 이름의 `/`는 주소에서 `-`로 바뀌니, 실제 주소는 Vercel 배포 화면에서 복사합니다.
    - **운영용 프로젝트**: 실제 사이트 주소만 넣습니다(지금은 `https://rise-crew-web.vercel.app/**`). localhost와 미리보기 주소는 **넣지 않습니다.** 미리보기는 개발용 DB에 연결되므로 운영용에는 필요 없고, 넣으면 운영 계정의 로그인 링크가 미리보기로 돌아갈 길이 열립니다.
  - **와일드카드로 팀 이름까지 걸치지 않습니다.** `https://rise-crew-web-git-*-rise-crew1.vercel.app/**`처럼 쓰면 `-rise-crew1`로 끝나는 다른 Vercel 팀의 주소도 맞아서, 그 팀이 로그인 링크의 토큰을 받을 수 있습니다. 로그인 화면은 링크를 요청할 때 자기 주소를 돌아올 곳으로 넘기므로, 이 허용 목록이 그 주소를 지키는 유일한 문입니다.
- **Custom Access Token 훅**: Authentication의 Auth Hooks에서 Custom Access Token을 켭니다. 유형은 **Postgres**, 함수는 `public.custom_access_token_hook`입니다. 토큰의 `app_role`과 `blocked`는 메뉴 표시용이고 권한 판단에는 쓰지 않습니다(RLS는 `user_roles` 테이블을 직접 읽습니다).

### 6. 보안 점검

대시보드의 Security Advisor와 Performance Advisor가 **둘 다 0건**이어야 합니다. 대시보드의 "automatic RLS" 설정이 만드는 `public.rls_auto_enable()` 함수는 마이그레이션이 클라이언트 실행 권한을 회수합니다. 새 경고가 나오면 새 마이그레이션으로 고칩니다.

### 7. Vercel 환경변수

Vercel의 Settings → Environment Variables에 `NEXT_PUBLIC_AUTH_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`를 넣습니다. `SUPABASE_SECRET_KEY`는 비밀 값(Secret)으로 저장합니다.

- **Preview**에는 개발용 프로젝트의 값을 넣습니다. Preview는 **브랜치마다** 지정하는 값이라서, 새 작업 브랜치에서 로그인을 쓰려면 그 브랜치를 추가해야 합니다(5번의 Redirect URLs도 함께). 절차는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.
- **Production**은 두 단계로 나눠 넣습니다.
  - **PR을 merge하기 전에**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`를 **운영용** 프로젝트의 값으로 넣습니다. `NEXT_PUBLIC_AUTH_ENABLED`는 **만들지 않고 비워 둡니다.** 스위치가 꺼져 있으면 값이 있어도 계정 기능은 꺼진 채라서(위 "계정 기능 스위치"), merge해도 사이트는 그대로입니다.
  - **출시할 때**: 위 "Production에서 켜기"를 거친 뒤 `NEXT_PUBLIC_AUTH_ENABLED=true` 하나만 더하고 다시 배포합니다.
- 값을 바꾼 뒤에는 다시 배포해야 반영됩니다.

### 8. 확인

PR 미리보기 주소에서 구글 로그인과 이메일 링크 로그인이 끝까지 되는지 봅니다. 대시보드에서는 계정이 생겼는지, 역할이 `guest`인지 확인합니다. 개인정보 처리방침의 사실도 실제와 맞는지 다시 봅니다(리전 서울, 구글의 기본 권한만 사용, 메일을 보내는 Gmail 계정, 사본의 30일 자동 삭제).

## 배포 주소

- `main`에 merge하면 Vercel이 `https://rise-crew-web.vercel.app`에 배포한다. 이 주소는 **진짜 도메인을 연결하기 전까지 쓰는 임시 주소**다.
- 임시 주소는 검색엔진에 잡히지 않게 막아 둔다(`robots.txt` Disallow, 모든 페이지 `noindex`).
- 진짜 도메인을 연결할 때 Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`에 그 주소(예: `https://도메인`)를 넣고 다시 배포하면 검색 허용, canonical, sitemap 주소가 모두 그 도메인으로 바뀐다. `*.vercel.app`이나 `localhost`를 넣으면 계속 막힌 상태로 남는다.

### 진짜 도메인을 연결할 때 함께 바꿀 것

계정 기능이 켜진 뒤에는 도메인이 바뀌면 아래도 함께 바꿔야 로그인이 계속됩니다.

- [ ] Vercel: 도메인 연결, `NEXT_PUBLIC_SITE_URL`에 새 주소, 다시 배포.
- [ ] Supabase(운영용 프로젝트): Site URL을 새 주소로, Redirect URLs에 `https://도메인/**`를 더한다. 쓰지 않는 임시 주소 줄은 지운다. 로그인 메일의 링크는 요청한 화면의 주소를 따라가므로 메일 양식은 고치지 않아도 된다.
- [ ] Google Cloud(OAuth 동의 화면): 브랜딩에 앱 이름, 로고, 홈페이지 주소, 개인정보 처리방침 링크(`https://도메인/ko/privacy`), 승인된 도메인을 새 도메인으로 넣는다. 게시 상태를 Testing에서 **In production**으로 올려야 목록에 없는 사람도 구글 로그인을 쓸 수 있다. 구글 화면의 안내를 읽고 따른다.
- [ ] Google Cloud(OAuth 클라이언트): 승인된 리디렉션 URI는 Supabase 주소(`.../auth/v1/callback`)라서 도메인과 상관없이 그대로다. 아래 1번에서 Supabase 사용자 지정 도메인을 쓰기로 하면 그 주소의 콜백을 **더한다**.
- [ ] Vercel 환경변수(Production): 4개 값이 운영용 프로젝트를 가리키는지 확인한다.
- [ ] 메일을 보내는 계정을 바꾸면 SMTP와 Gmail 필터, 개인정보 처리방침도 함께 바꾼다(CONTRIBUTING 참고).

### 출시 전에 정할 것

1. **구글 로그인 화면의 주소.** 구글 동의 화면의 "…와 데이터를 공유합니다" 안내에 우리 도메인이 아니라 Supabase 프로젝트 주소(`<프로젝트 ref>.supabase.co`)가 보입니다. 바꾸려면 Supabase 사용자 지정 도메인이 필요하고, 이것은 유료 플랜 프로젝트에 붙이는 유료 추가 기능(add-on)입니다(Supabase 문서, 2026-10-28 확인). 비용을 들일지, 그대로 둘지 출시 전에 정합니다.
2. **무료 플랜 일시정지.** Supabase 문서에 따르면 Free 플랜 프로젝트는 7일 동안 활동이 적으면 일시정지됩니다(Supabase 문서 "Project Pausing", 2026-10-28 확인). 이 사이트의 공개 페이지는 정적이라 방문만으로는 DB 활동이 생기지 않을 수 있는데, 정말 그런지는 **확인 필요**입니다. 정지된 프로젝트를 대시보드에서 되살릴 수 있는 기간은 읽은 자료마다 달라 **확인 필요**입니다. 운영용 프로젝트가 멈추면 로그인이 멈추므로, 유료 플랜으로 올릴지 활동이 끊기지 않게 할지 출시 전에 정합니다.

## 구조

- `src/app/[locale]/`: 페이지 (`/ko`, `/en`). 계정 화면은 `login/`, `welcome/`(가입 정보), `me/`(마이페이지), `admin/members/`(회원 관리)
- `src/content/data/`: 사이트 콘텐츠 데이터. 형식은 `src/content/schema.ts`가 검사합니다
- `messages/ko.json`, `messages/en.json`: 버튼, 메뉴, 제목 문구, 개인정보 처리방침 본문
- `src/components/home/`: 홈 구성(첫 화면, 숫자, Campus·Domestic·Global 장, 지원 안내)
- `src/components/stage/`: 무대 스타일 공용 컴포넌트(사진, 숫자 카운트업, 단계 레일, 고정 갤러리)
- `src/lib/auth/`: 역할, 가입 정보 검사, 로그인 후 이동 주소, 마지막 관리자 보호 같은 계정 규칙
- `src/lib/supabase/`: Supabase 연결(브라우저, 서버, 관리자 키), 세션 갱신, 생성된 DB 타입
- `supabase/`: 로컬 설정(`config.toml`), 마이그레이션, DB 테스트, 로컬 시드, 로그인 메일 양식
- `public/fonts/`: 직접 호스팅하는 글꼴(Pretendard, Wanted Sans). 패키지 버전을 올린 뒤 `pnpm fonts:vendor`로 다시 복사합니다
- 설계 문서: `docs/superpowers/specs/`, 디자인 방향: `.impeccable/surfaces/`, 디자인 규칙: `DESIGN.md`

## 보안 규칙

이 저장소는 **public**입니다.

- 비밀키(`.env*`, Supabase `SUPABASE_SECRET_KEY`와 `service_role` 키 등)는 절대 커밋하지 않습니다. `.env.example`만 커밋합니다.
- 지원자·회원 개인정보는 저장소에 넣지 않습니다. 테스트 데이터는 가짜 값(`example.test` 주소)을 사용합니다.
- 구글 앱 비밀번호, 백업 코드, 비밀번호는 저장소, 이슈, PR, 채팅에 적지 않습니다.
- 키를 실수로 push했다면 파일 삭제로는 해결되지 않습니다. 즉시 해당 키를 재발급하세요.

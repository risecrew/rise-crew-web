---
name: RISE CREW
description: 성균관대학교 창업 동아리 RISE CREW 공식 홈페이지. 어두운 객석 위 데모데이 무대.
colors:
  cobalt: "#003e91"
  lime: "#9fc952"
  leaf: "#49b67e"
  teal: "#10a1c7"
  sky: "#0dbedb"
  ocean: "#0175ba"
  stage: "#07090f"
  on-stage: "#ffffff"
  on-stage-soft: "rgb(255 255 255 / 0.75)"
  on-stage-dim: "rgb(255 255 255 / 0.55)"
  stage-rule: "rgb(255 255 255 / 0.15)"
  paper: "#f4f9f7"
  paper-edge: "#dbe9e4"
  ink: "#13203a"
  ink-soft: "#46546d"
typography:
  chapter:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "calc(100cqw / <word-em> * 0.98)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.03em"
  display:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "clamp(3rem, 8.5vw, 8rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.025em"
  slogan:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 7.4vw, 6rem)"
    fontWeight: 850
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "clamp(5rem, 13vw, 11rem)"
    fontWeight: 900
    lineHeight: 0.85
    fontFeature: "\"tnum\" 1"
  account-title:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 9vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3.4rem)"
    fontWeight: 850
    lineHeight: 1.04
  title:
    fontFamily: "'Wanted Sans Variable', 'Pretendard Variable', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 850
    lineHeight: 1.33
  body-lead:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.56
  body:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  control:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.2em"
  data:
    fontFamily: "var(--font-jetbrains), ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "4px"
  lg: "8px"
  full: "9999px"
spacing:
  rule-gap: "16px"
  gutter: "20px"
  gutter-md: "40px"
  section: "80px"
  section-md: "112px"
  chapter: "96px"
  chapter-md: "144px"
  rail-inset-lg: "240px"
  rail-inset-xl: "288px"
  container: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-compact:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-light:
    backgroundColor: "{colors.on-stage}"
    textColor: "{colors.stage}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-outline:
    textColor: "{colors.on-stage}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  field-pill:
    backgroundColor: "rgb(255 255 255 / 0.05)"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.full}"
    padding: "14px 20px"
  pill-radio:
    textColor: "{colors.on-stage}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  tick:
    backgroundColor: "rgb(255 255 255 / 0.05)"
    rounded: "{rounded.sm}"
    width: "24px"
    height: "24px"
  link-inline:
    textColor: "{colors.on-stage}"
  link-accent:
    textColor: "{colors.lime}"
  chip-outline:
    textColor: "{colors.on-stage}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  temporary-badge:
    backgroundColor: "rgb(0 0 0 / 0.55)"
    textColor: "rgb(255 255 255 / 0.9)"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  photo-frame:
    rounded: "{rounded.lg}"
    height: "72svh"
  mobile-menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
    width: "256px"
  account-menu-panel:
    backgroundColor: "rgb(7 9 15 / 0.9)"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.lg}"
    padding: "8px"
    width: "256px"
  site-footer:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-stage}"
    padding: "56px 40px"
---

# Design System: RISE CREW

## Overview

**Creative North Star: "데모데이 무대"**

사이트 전체가 불이 꺼진 객석에서 올려다보는 하나의 무대다. 바탕은 색이 거의 없는 무대 검정이고, 빛은 로고에서만 온다. 로고 코발트는 숫자 구간과 사진 없는 장면을 물들이는 조명이고, 라임은 무대 위에서 손을 드는 순간(행동 버튼, R·I·S·E 머리글자, 거대한 숫자)에만 켜진다. 실제 사람이 찍힌 사진이 화면 폭을 채우고, 그 위에 Wanted Sans의 매우 굵은 글자가 직접 올라간다.

밀도는 낮고 크기 대비는 극단적이다. 장(章) 이름 Campus · Domestic · Global은 콘텐츠 폭을 끝에서 끝까지 가로지르고, 숫자는 최대 11rem까지 커진다. 그 사이의 정보는 카드가 아니라 얇은 흰 선(15~20% 불투명) 위에 라벨과 값을 쌓는 발표 자료 부록 같은 표로 정리된다. 상자, 그림자, 둥근 카드가 없는 평면이고, 깊이는 사진, 어둡게 까는 그라데이션, 코발트 빛 번짐으로만 만든다.

움직임은 확실히 체감되되 항상 스크롤 방향을 따른다. 첫 화면 사진은 고정된 채 물러나며 어두워지고, 숫자는 같은 박자로 올라가며 굵어지고, Global은 화면을 고정한 채 도시 사진을 아래에서 위로 덮는다. JavaScript가 없거나 `prefers-reduced-motion`이면 모든 연출이 최종 상태로 멈춰 보인다. 16:9 슬라이드 틀, 슬라이드 번호, 단체 사진 히어로 아래 카드 격자는 이 세계가 거부한 형식이다.

계정 화면(로그인, 가입 정보, 마이페이지, 회원 관리)은 같은 객석 안의 작은 방이다. 사진이 없으므로 코발트 조명이 위쪽 가장자리에서 내려오고(404는 아래에서 올라온다), 내용은 그 빛 아래 가운데 한 줄로 선다. 이 화면들은 소개가 아니라 입력과 확인이라서 큰 글자는 제목 하나뿐이고, 나머지는 알약형 입력칸과 가로선 목록이 맡는다. 라임 알약은 화면마다 하나를 넘지 않고, 그 화면이 하려는 일에만 켜진다.

**Key Characteristics:**
- 거의 검은 무대 바탕(`stage`) 위의 흰 글자, 색은 로고에서만 가져온다.
- 코발트는 조명, 라임은 행동과 강조, 심볼 그라데이션은 진행 표시에만.
- 실제 사진을 화면 폭으로, 아래쪽 어둠 그라데이션 위에 글자를 얹는다.
- 콘텐츠 폭을 가로지르는 장 이름과 가변 굵기의 거대한 숫자.
- 카드 대신 얇은 가로선으로 나눈 라벨·값 목록.
- 스크롤에 묶인 고정 장면 전환, 움직임 축은 언제나 세로.
- 계정 화면: 위에서 내려오는 코발트 조명, 알약 입력칸, 화면마다 라임 알약은 많아야 하나, 오류는 색이 아니라 문장으로.

## Colors

로고 원본의 코발트와 심볼 다섯 색이 팔레트의 전부이고, 나머지는 색을 갖지 않은 무대 검정과 흰 글자의 불투명도 단계다.

### Primary
- **로고 코발트** (`cobalt`): 무대 조명. 숫자 구간에서 사진을 덮는 코발트 그라데이션(82~90% 불투명), 사진 없는 Campus 장과 404 표지 아래쪽의 방사형 빛 번짐(55%), 계정 화면 위쪽에서 내려오는 방사형 조명(60%), 사이트 푸터 전체 바탕, 라임 버튼 위 글자색, `accent-color`, 스크롤바 색(45% 혼합)에 쓴다.

### Secondary
- **심볼 라임** (`lime`): 켜지는 순간. 행동 버튼 바탕, 슬로건과 R·I·S·E 목록의 머리글자, Campus의 VCC 18과 Global의 대회 숫자, 강조 링크(전체 보기, 출처), 5단계 육성 플랜의 윗선과 번호, FAQ 열기 기호, 가입 정보의 동의 상자와 회원 관리의 선택 상자를 채우는 바탕(체크는 코발트), 포커스 링, 선택 영역 바탕(글자는 코발트), 입력 커서에 쓴다. 계정 화면에서는 가입 완료, 정보 수정, "회원으로" 같은 화면의 주된 행동 버튼 바탕이다.

### Tertiary
- **심볼 그라데이션** (`lime` → `leaf` → `teal` → `ocean`): 장 레일의 진행 막대에서만 쓴다. 데스크톱은 위에서 아래로, 휴대폰은 왼쪽에서 오른쪽으로 차오른다.
- **심볼 하늘색** (`sky`): 로고 심볼의 다섯 번째 색으로 토큰에 남아 있지만, 화면 요소에는 쓰지 않는다. 레일 그라데이션은 방향 계약대로 네 색(라임 → 초록 → 청록 → 파랑)이다.

### Neutral
- **무대 검정** (`stage`): 모든 페이지의 바탕. 색조가 거의 없는 객석의 어둠이고, 푸른 기운은 코발트 조명에서만 온다. 사진 아래쪽 어둠 그라데이션(15% → 25% → 88%), 첫 화면 사진이 물러날 때 덮는 막(최대 55%), 휴대폰 레일 바탕(85%, 배경 흐림)에도 같은 값을 쓴다.
- **무대 위 흰색** (`on-stage`, `on-stage-soft`, `on-stage-dim`): 제목과 값은 흰색 그대로, 본문과 리드 문장은 75~85%, 꺼진 레일 항목과 지나간 일정, 라벨은 55~60%. 계정 화면에서는 입력칸 테두리 50%(오류가 있으면 100%), 입력칸 안쪽 바탕 5%, 선택한 표 행 바탕 6%, 안내 상자 테두리 25%를 쓴다. 입력칸 라벨은 75%, 목록 라벨과 표 머리글은 60%다.
- **무대 가로선** (`stage-rule`): 사실 목록, 일정표, 프로그램 목록을 나누는 1px 선. 장 안의 묶음은 20%, 섹션 경계는 10%로 한 단계씩 조절한다.
- **종이와 잉크** (`paper`, `paper-edge`, `ink`, `ink-soft`): 휴대폰 메뉴 패널에만 쓰는 밝은 면. 메뉴 바탕은 종이, 항목 hover와 구분선은 종이 가장자리, 글자는 잉크다. 로그인한 뒤 패널에 들어오는 계정 줄(이름 첫 글자 원, 마이페이지, 로그아웃)도 같은 면이고, 원은 코발트 바탕에 흰 글자, 이메일은 `ink-soft`다. 이 패널 안에서는 포커스 링이 라임 대신 코발트로 바뀐다.

### Named Rules
**The Logo Light Rule.** 색은 로고에서만 온다. 코발트, 라임, 심볼 그라데이션 외의 색상(남색, 보라, 임의의 파랑)을 메인이나 강조로 들이지 않는다. 무대 검정은 색조가 없어야 하고, 잉크는 휴대폰 메뉴 밖으로 나오지 않는다.

**The Lime Is A Cue Rule.** 라임은 행동 버튼, 머리글자, 일부 숫자, 강조 링크와 포커스에만 켠다. 제목 전체나 넓은 면을 라임으로 칠하지 않는다.

**The Gradient Means Progress Rule.** 심볼 그라데이션은 "지금 어디까지 왔는가"를 보여주는 진행 표시에만 쓴다. 버튼, 글자, 배경 장식에 쓰지 않는다.

**The Words, Not Red Rule.** 오류와 확인은 색이 아니라 문장으로 말한다. 로고에 없는 빨강이나 초록을 들이지 않고, 오류가 있는 입력칸은 테두리를 50%에서 100% 흰색으로 올린 뒤 흰 문장으로 이유를 쓴다. 유일한 외부 색은 구글 로그인 버튼의 "G" 표식 안에 있는 구글의 네 가지 색이고, 표식 밖으로 나오지 않는다.

## Typography

**Display Font:** Wanted Sans Variable (with Pretendard Variable, system-ui)
**Body Font:** Pretendard Variable (with Pretendard, system-ui, -apple-system)
**Label/Mono Font:** JetBrains Mono (날짜와 데이터 전용)

**Character:** Wanted Sans의 850~900 굵기가 무대 위 거대한 글자를 맡고, Pretendard가 한국어 본문을 단정하게 받친다. 두 서체 모두 한글과 라틴을 함께 다루므로 국문과 영문 페이지가 같은 무게로 보인다. JetBrains Mono는 날짜와 번호에만 쓰여 "기록된 사실"의 표시가 된다.

**Loading:** Wanted Sans Variable과 Pretendard Variable은 사이트가 직접 호스팅한다. 공식 npm 패키지(`pretendard`, `wanted-sans`)의 동적 부분집합(unicode-range로 나눈 작은 woff2) 파일을 `pnpm fonts:vendor`로 `public/fonts/<패키지>-<버전>/`에 복사하고, `src/lib/fonts.ts`의 CSS로 불러온다. 폴더 이름에 버전이 있어 1년 캐시(immutable)를 건다(`next.config.ts`). 외부 CDN은 쓰지 않는다. JetBrains Mono는 `next/font/google`로 빌드 때 내려받아 `--font-jetbrains` 변수로 연결한다.

### Hierarchy
- **Chapter** (900, 콘텐츠 폭에 맞춘 `calc(100cqw / 단어폭 * 0.98)`, 0.82, -0.03em): Campus · Domestic · Global 장 이름. 컨테이너 쿼리로 단어가 콘텐츠 폭 전체를 가로지르도록 크기를 정하고, 줄바꿈하지 않는다. 단어폭(em)은 Wanted Sans 900, -0.03em에서 잰 값이다.
- **Display** (900, `clamp(3rem, 8.5vw, 8rem)`, 0.92, -0.025em): 안쪽 페이지 표지 제목.
- **Slogan** (850, `clamp(2.6rem, 7.4vw, 6rem)`, 0.95, -0.02em): 첫 화면 R·I·S·E 슬로건. 한 줄에 한 문장, 머리글자만 라임.
- **Numeral** (스크롤에 따라 400 → 950, 정지 상태 900, `clamp(5rem, 13vw, 11rem)`, 0.85, 고정폭 숫자): 90+ · 22+ · 33, VCC 18. 대회 숫자는 한 단계 작은 `clamp(4.5rem, 9vw, 8rem)`. 라벨은 숫자 아래에 놓는다.
- **Account Title** (900, `clamp(3.25rem, 9vw, 6rem)`, 0.95, -0.025em, `text-wrap: balance`): 로그인, 가입 정보("반가워요!"), 마이페이지 제목. 회원 관리는 표 폭을 위해 `clamp(2.5rem, 6vw, 4rem)`, 로그인 링크를 보낸 뒤의 "메일함을 확인해 주세요"는 `clamp(2rem, 6vw, 3.4rem)` 850, 1.04로 한 단계 낮춘다. 계정 화면 제목은 이 세 가지뿐이다.
- **Headline** (850, `clamp(1.9rem, 4vw, 3.4rem)`, 1.04): 안쪽 페이지의 섹션 제목. 홈 장 안의 제목은 30px → 48px(md)로 같은 굵기를 쓴다. `text-wrap: balance`.
- **Title** (800~850, 20~30px): 프로그램 이름, 멘토 이름, 사실 값(MOU 날짜, 팀당 500만 원).
- **Body Lead** (400, 18px): 제목 아래 설명 문장. 최대 폭 42~48rem(`max-w-2xl`~`max-w-3xl`), 75% 흰색.
- **Body** (400, 16px): 일반 문단과 목록. 계정 화면의 입력 문장, 오류·확인 메시지(흰색), 동의 문장(85%)도 16px이다. 로그인과 가입의 리드 문장은 18px 85%, `break-keep`.
- **Label** (500, 14px): 사실 목록의 라벨(60% 흰색), 보도 출처 줄, 프로그램 요약. 계정 화면의 입력칸 라벨(75% 흰색), 회원 표의 머리글(60%), 역할 칩(600)도 이 크기다.
- **Control** (600, 12px, 0.2em, 대문자): 언어 전환과 휴대폰 메뉴 버튼처럼 라틴 글자로 된 조작 요소에만.
- **Data** (JetBrains Mono, 14px): 날짜와 단계 번호(01~05). `dd`와 `time`은 전역에서 고정폭 숫자를 쓴다.

### Named Rules
**The Keep-Words Rule.** 한국어 문장과 제목은 모두 `word-break: keep-all`로 어절 단위로 줄을 바꾼다. 음절 중간에서 끊긴 한국어 제목은 결함이다.

**The Weight Is Motion Rule.** 숫자의 굵기 변화(400 → 950)는 스크롤 연출의 일부다. 움직임이 꺼진 환경에서는 처음부터 900으로 보인다.

## Layout

콘텐츠 컨테이너는 최대 1280px이고 좌우 여백은 20px, md(768px) 이상에서 40px이다. 안쪽 페이지의 섹션은 위아래 80px, md 이상 112px이며, 섹션끼리는 10% 흰 선 하나로 나뉜다. 섹션 안은 대개 lg(1024px)에서 두 열(제목과 리드 | 사실 목록)로 갈라진다.

홈의 세 장은 더 넓게 숨 쉰다. 위아래 96px, md 이상 144px. lg 이상에서는 왼쪽에 고정 레일이 서므로 장 콘텐츠의 왼쪽 여백을 240px(xl 288px)로 비운다. 휴대폰에서는 레일이 화면 위쪽 막대가 되고 왼쪽 여백은 일반 값으로 돌아온다.

사진 장면은 화면 높이 단위로 잡는다. 첫 화면은 170svh 스크롤 동안 100svh를 고정한다. Domestic 첫머리는 85svh, 안쪽 표지는 78svh(최소 560px), md 이상 88svh이며, 사진이 없는 표지는 70svh다. Global 고정 갤러리는 도시마다 100svh 스크롤을 쓰고, 마지막 도시 뒤에 0.3화면을 더 머문다. 데스크톱에서는 글과 사진을 0.85 : 1.15 두 열로, 휴대폰에서는 사진(42svh) 아래 글로 쌓는다.

계정 화면은 하나의 틀(`account-layout.tsx`)에 들어간다. `main`이 무대 검정 바탕으로 화면 높이(`min-h-svh`)를 채우고, 내용을 가운데 한 줄로 세운다. 위쪽 여백 128px은 투명한 헤더를 비우고, 아래 80px, 좌우는 20px(md 이상 40px)다. 내용 폭은 로그인 `max-w-md`(448px), 가입 정보와 마이페이지 `max-w-lg`(512px), 회원 관리 `max-w-6xl`(1152px)이다. 조명은 틀 위쪽에 80svh 높이로 깔리는 타원 방사형 그라데이션(너비 75%, 높이 65%, 위쪽 가운데 중심, 코발트 60% → 70%에서 투명)이고 내용 뒤에 있다. 가입 정보 양식은 이메일, 이름, 하고 있는 일, 동의, 제출 버튼이 각각 위쪽 15% 흰 선과 20px(동의는 16px) 여백으로 나뉜 행이다. 이름 칸은 두 열이고 한국어는 성, 이름 순서, 영어는 이름, 성 순서다.

회원 관리 표는 휴대폰에서 사람마다 쌓인 행(선택 상자 44px 열, 이름과 역할 칩, 이메일, 하고 있는 일, 학교·전공 또는 소속, 모집 소식 동의 여부)이고, lg(1024px) 이상에서는 고정 폭 표(선택 56px, 이름 11%, 이메일 27%, 하고 있는 일 12%, 학교·전공·소속 20%, 모집 소식 9%, 역할 14%)다. 두 경우 모두 행은 위쪽 15% 흰 선으로 나뉘고, 선택한 행은 흰색 6% 바탕이 깔린다.

**The Ruled List Rule.** 정보 묶음은 위쪽 1px 선과 16px 안쪽 여백으로 시작한다. 카드 상자나 배경 면으로 묶지 않는다.

## Elevation & Depth

평면 시스템이다. 무대 위 요소에는 그림자가 없고, 깊이는 세 가지로만 만든다. 사진 아래쪽을 무대 검정으로 어둡게 하는 세로 그라데이션, 코발트 조명의 방사형 번짐, 그리고 스크롤에 묶인 크기 변화(첫 화면 1.18 → 1, Global 사진 1.12 → 1)다. 화면 위에 떠야 하는 것(휴대폰 레일, 임시 사진 표시, 로그인한 뒤 헤더의 계정 패널)은 반투명 바탕과 배경 흐림으로 띄운다. 계정 패널은 90% 무대 검정, 15% 흰 테두리, 배경 흐림이고 그림자가 없다. 열릴 때는 위쪽 4px, 0.98배에서 150ms 지수 감속으로 자리를 잡고, 움직임이 꺼지면 바로 나타난다. 계정 화면의 깊이는 위에서 내려오는 코발트 조명 하나뿐이다.

### Shadow Vocabulary
- **메뉴 패널 그림자** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): 휴대폰 메뉴 패널 하나에만 쓴다. 밝은 종이 패널이 어두운 무대 위에 열리는 유일한 떠 있는 면이다.

### Named Rules
**The Light, Not Lift Rule.** 무대에서 무언가를 강조할 때는 그림자로 띄우지 않고 빛(코발트 번짐, 라임)으로 비춘다.

## Shapes

형태 언어는 두 가지다. 상호작용하는 작은 요소는 완전한 알약형(9999px)이다: 행동 버튼, 임시 사진 표시, 운영진·파트너 칩, 일정 상태 표시. 사진은 화면 폭이면 모서리가 없고, 콘텐츠 폭 안에 놓인 사진 틀(Global 갤러리)과 휴대폰 메뉴 패널만 8px로 살짝 둥글린다. 4px는 휴대폰 메뉴 버튼, 건너뛰기 링크, 파트너 로고 받침, 동의·선택 상자(24px 정사각형) 같은 작은 보조 요소에만 쓴다. 나머지 구조는 모서리 없이 가로선으로 나눈다.

계정 화면에서는 입력칸, 알약 선택, 버튼이 모두 알약형이다. 8px는 안내 상자 둘과 헤더의 계정 패널 하나뿐이다. 안내 상자는 로그인 화면의 안내(링크가 만료됨, 이용 제한 같은 이유)와 계정을 삭제한 뒤 홈 위쪽에 한 줄 나오는 안내이고, 둘 다 25% 흰 테두리다. 오류 문장 자체는 상자 없이 입력칸 아래의 글자로만 둔다.

## Components

### Buttons
무대 위에서 유일하게 켜진 버튼. 자신 있고 손에 잡힌다.
- **Shape:** 완전한 알약형(9999px).
- **Primary:** 라임 바탕에 코발트 글자, 600 굵기, 12px 24px. 지원하기(모집 중) 또는 모집 안내 보기(모집 기간 아님) 한 가지 행동만 맡는다. 헤더와 휴대폰 메뉴에서는 8px 16px의 작은 판을 쓴다.
- **Hover / Focus:** hover에서 2px 떠오르고, 누르면 0.97로 줄어든다(150ms, ease-out). 포커스는 2px 라임 외곽선, 3px 간격.
- **Secondary:** 버튼 옆의 보조 행동(제휴 문의)은 버튼이 아니라 흰 글자 밑줄 링크다. 밑줄 간격 4px.
- **Light (계정):** 흰 바탕에 무대 검정 글자, 알약, 12px 24px, 600. 로그인 화면의 "구글로 계속하기" 하나에만 쓴다. 글자 앞에 구글의 "G" 표식을 단다(장식이라 버튼 이름은 글자가 맡는다). 라임이 아닌 면이라서 같은 화면의 라임 알약(로그인 링크 받기)을 가리지 않는다.
- **Outline (계정):** 투명 바탕, 50% 흰 테두리, 흰 글자, 알약, 12px 24px, 600. 라임 알약이 이미 있는 화면의 나머지 행동이다. "링크 다시 받기", 계정 삭제 제출, 회원 관리의 "가입자로", "운영진으로", "관리자로", "차단", "차단 해제", 검색 버튼. hover에서 흰색 10% 바탕이 깔리고 누르면 0.97로 줄어든다(150ms, ease-out). 회원 관리에서는 높이를 48px 이상으로 잡는다.
- **Text button (계정):** 흰 글자 밑줄 링크처럼 보이는 행동(로그아웃, "다른 이메일로 받기", 정보 수정 취소, 회원 탈퇴 열기, 표의 이전·다음). 글자가 작아도 누르는 영역은 높이 44px 이상(`min-h-11`)으로 잡는다.
- **Disabled:** 보내는 동안 알약은 60%로 흐려지고 눌리지 않는다. 선택할 수 없는 행의 선택 상자는 40%다.

### Chips
- **Style:** 20~25% 흰 테두리 알약, 투명 바탕, 14px 600. 운영진 직함, 파트너 이름, 일정 상태(예정, 미확정)에 쓴다. 계정 화면에서는 역할 배지(가입자, 회원, 운영진, 관리자)도 이 칩이고, 차단된 계정에만 100% 흰 테두리의 "차단됨" 칩이 하나 더 붙는다.
- **State:** 상태를 바꾸지 않는 표시용이다.

### Form Fields
입력칸은 라벨 위, 칸 아래, 메시지는 칸 바로 밑이다.
- **Style:** 알약형, 50% 흰 테두리, 흰색 5% 바탕, 흰 글자 16px, 안쪽 여백 14px 20px, 칸 위에 8px 간격. 자리표시자는 55% 흰색. 라벨은 칸 위에 항상 보이는 14px 500, 75% 흰색이고 자리표시자가 라벨을 대신하지 않는다. 로그인의 이메일 칸은 `type="email"`이고 자동 완성은 켜고 자동 대문자는 끈다.
- **Error:** 테두리가 100% 흰색으로 올라가고(`aria-invalid`), 칸 아래에 16px 흰 문장이 8px 간격에 좌우 8px 안쪽 여백으로 붙는다. 칸을 고치기 시작하면 그 칸의 메시지가 사라진다. 제출한 뒤에는 첫 오류 칸에 포커스가 간다. 양식 아래에는 "확인이 필요한 항목이 N개 있어요" 요약이 한 줄 나온다.
- **Focus:** 전역 규칙대로 2px 라임 외곽선, 3px 간격.
- **Read-only value:** 가입 때 이미 받은 이메일은 칸이 아니라 목록 행(라벨 14px 60%, 값 18px 600)으로 보여 주고 다시 묻지 않는다.

### Pill Radios
- **Style:** "지금 하고 있는 일"처럼 하나만 고르는 짧은 선택. 알약마다 25% 흰 테두리, 흰 글자 16px 600, 안쪽 여백 10px 16px, 알약끼리 8px 간격, 줄이 넘치면 아래로 접힌다. 고른 알약은 흰 바탕에 무대 검정 글자와 100% 흰 테두리로 뒤집힌다. 아직 고르지 않은 알약에만 hover의 흰색 10% 바탕이 깔리고, 누르면 0.97로 줄어든다(150ms, ease-out).
- **Structure:** 진짜 라디오 버튼이 알약 위를 투명하게 덮는다. 탭 정지는 하나이고 방향키로 고르며, 포커스 링은 알약 바깥에 라임 2px, 3px 간격으로 나온다. 고른 값에 맞는 칸(대학생·대학원생은 학교와 전공, 그 밖은 소속)은 CSS만으로 나타나서 JavaScript가 오기 전에도 맞는 질문이 보인다.

### Tick
- **Style:** 24px 4px 정사각형, 50% 흰 테두리, 흰색 5% 바탕. 체크하면 라임 바탕과 테두리에 코발트 체크 표식(직접 그린 SVG, 선 2.2)이고, 일부만 고른 상태(회원 관리의 "모두 선택")는 같은 라임에 코발트 가로 대시다. 네이티브 체크박스는 어두운 바탕에서 사라지므로 `appearance-none`으로 직접 그리고, 실제 입력은 그대로 아래에 있어 키보드와 포커스를 지킨다.
- **Consent row:** 위쪽 15% 흰 선, 16px 위아래 여백, 상자 오른쪽에 16px 85% 흰 문장. 라벨이 문장이고, 처리방침 링크는 라벨 밖 괄호 안에 밑줄 링크로 둔다. 오류 메시지는 상자 폭만큼 들여 쓴다.

### Notices
- **Inline notice:** 로그인 화면 제목 아래의 이유 안내. 25% 흰 테두리 8px 상자, 16px 흰 글자, 안쪽 여백 16px 12px. 오류는 `role="alert"`, 다시 보낸 확인은 `role="status"`로 읽힌다.
- **Home line:** 계정을 삭제하면 홈 맨 위에 같은 모양의 안내 한 줄이 가운데 정렬로 뜬다. 홈은 정적이라 주소의 `?deleted=1`을 브라우저에서 읽는다.
- 상태 영역은 처음부터 화면에 있고 비어 있다가 내용이 들어오면 읽힌다.

### Account Screens
- **로그인:** 제목(Account Title), 18px 리드 "처음이면 로그인하면서 가입돼요", 흰 구글 알약, 15% 흰 선 두 줄에 낀 "또는", 이메일 칸, 라임 알약 "로그인 링크 받기" 순서로 세로 한 줄(`max-w-md`). 링크를 보낸 뒤에는 같은 자리에 한 단계 낮은 제목, 보낸 주소(18px 600), 스팸함 안내, Outline 알약 "링크 다시 받기"(기다리는 동안 남은 초를 보여 준다), 밑줄 텍스트 버튼 "다른 이메일로 받기"가 온다. 상태가 바뀌면 제목으로 포커스가 간다.
- **가입 정보:** 제목 "반가워요!", 리드, 위 Form Fields와 Pill Radios와 Tick으로 짠 양식. 맨 아래 15% 흰 선 아래에 폭 가득한 라임 알약 "가입 완료" 하나다.
- **마이페이지:** 제목, 64px 원(50% 흰 테두리, 이름 첫 글자 Wanted Sans 800 30px)과 이름(Title 24px 850), 이메일(16px 75%), 역할 칩. 아래로 Ruled Fact List(하고 있는 일, 학교, 전공 또는 소속, 모집 소식 수신), 그 아래 15% 선 위에 폭 가득한 라임 알약 "정보 수정", 밑줄 텍스트 버튼 "로그아웃". 맨 아래에 접힌 "회원 탈퇴"(`<details>`, 15% 선 아래)가 있고, 열면 제목(24px 850)과 설명, 확인 단어를 직접 입력하는 칸, Outline 알약이 나온다. 삭제는 라임이 아니라 Outline이다. 정보 수정은 같은 주소의 `?edit=1`이고 같은 제목이 그 자리에 남는다.
- **회원 관리:** 제목, 검색 줄(알약 검색칸, 역할 거르기 알약 선택 상자, "모집 소식 동의만" Tick, Outline 알약 "검색". 휴대폰에서는 세로, lg 이상에서는 한 줄), 총 인원 한 줄, 표, 아래 15% 선 아래의 결과 안내와 행동 줄, 이전·다음 쪽 이동. 행동 줄에서 라임 알약은 "회원으로" 하나이고 나머지 역할 버튼은 Outline이다. 운영진에게는 "운영진으로"와 "관리자로"가 보이지 않는다. 차단 버튼 둘은 오른쪽 끝(lg 이상)에 따로 묶인다. 결과 안내는 `role="status"`(성공), `role="alert"`(거부, 이름을 함께 적는다)다. 거부된 묶음은 선택이 남아 누구를 말한 것인지 보인다.

### Ruled Fact List
발표 자료 부록처럼 라벨 위, 값 아래.
- **Style:** 각 행은 위쪽 15% 흰 선, 16px 위아래 여백. 라벨은 14px 500(60% 흰색), 값은 18px 600 흰색. 넓은 화면에서 두 열로 나눌 수 있다.
- **Timeline variant:** 날짜(Mono, 60%) · 장소(600) · 행사명의 세 열. 아직 일어나지 않았거나 확인되지 않은 일정은 줄 전체를 60%로 낮추고 상태 칩을 단다.

### Navigation
- **Site header:** 사진 위에 투명하게 겹친다. 흰 심볼과 RISE CREW 워드마크(Wanted Sans 800), 오른쪽에 흰 글자 링크(hover 밑줄), 대문자 언어 전환, 작은 라임 버튼.
- **Account entry:** 로그인하기 전에는 오른쪽의 흰 글자 링크 "로그인"(hover 밑줄)이다. 로그인한 뒤에는 36px 원(50% 흰 테두리, 이름 첫 글자 Wanted Sans 800 16px)으로 바뀌고, 누르면 256px 계정 패널(Elevation 참고)이 열린다. 패널에는 이름과 이메일, 마이페이지, 운영진과 관리자에게만 보이는 관리, 로그아웃이 줄로 있다. 바깥을 누르거나 Esc나 Tab으로 나가면 닫히고 Esc는 원으로 포커스를 돌려준다. 어느 쪽인지는 브라우저가 세션을 읽어 정하므로 주변 페이지는 정적으로 남는다. 차단된 계정은 로그인하지 않은 것으로 보인다.
- **Mobile:** md 미만에서는 "MENU" 테두리 버튼(4px, 50% 흰 테두리)이 종이 바탕 패널을 연다. 패널은 잉크 글자, 항목 hover는 종이 가장자리, 아래에 코발트 언어 전환과 라임 버튼. 로그인한 뒤에는 라임 버튼 위에 계정 줄이 든다.
- **Footer:** 코발트 면 전체. 심볼, 워드마크, 슬로건 한 줄, 지원 기관 표기, 링크 목록, 공용 연락처.

### Stage Photo
사진이 주인공이다.
- **Style:** `object-cover`로 틀을 채우고, 아래로 갈수록 무대 검정으로 어두워지는 막(15% → 25% → 88%)을 깐 뒤 그 위에 흰 글자를 놓는다.
- **Temporary badge:** 원본이 오기 전의 임시 사진에는 오른쪽 위에 "임시 사진" 알약(55% 검정, 배경 흐림, 11px 600)을 단다. 화면 폭 사진에서는 헤더 아래로 내려 겹치지 않게 한다.
- **No photo:** 사진이 없는 장면(Campus, 404)은 사진을 흉내 내지 않고 코발트 방사형 조명을 아래나 위에서 비춘다.

### Count-Up Numeral
- 화면의 60%에 들어오면 0에서 목표값까지 1.4초, 지수 감속(easeOutExpo)으로 올라간다. 모든 숫자가 같은 시간을 써서 함께 멈춘다. 동시에 스크롤 위치에 따라 굵기가 400 → 950으로 변한다. 서버 렌더와 움직임 꺼짐 상태에서는 최종값이 900 굵기로 보이고, 화면 낭독기는 항상 최종값을 읽는다.

### Chapter Rail
- 세 장에 들어선 동안에만 보이고(300ms 페이드), 숨은 동안은 탭 순서에서도 빠진다. 데스크톱은 왼쪽 2px 세로 막대와 장 이름(Wanted Sans 850, 18px)·부제(12px), 휴대폰은 위쪽 85% 무대 검정 막대와 세 칸 이름, 아래 2px 진행 막대. 지금 장은 흰색과 `aria-current="step"`, 나머지는 55% 흰색. 각 항목은 해당 장으로 가는 링크다.

### Pinned Gallery (Global)
- 사진과 글을 함께 고정한다. 도시마다 한 화면의 스크롤 중 앞부분에서만 바뀐다. 다음 사진은 `clip-path`로 아래에서 위로 덮으며 1.12 → 1로 가라앉고, 이전 글은 48px 위로 빠져나간 뒤 새 글이 48px 아래에서 올라온다. 나머지 구간은 멈춰 읽힌다. 근접 스크롤 스냅이 가까운 도시에 맞춘다. 도시 목록은 지금 도시만 흰색이다. 움직임이 꺼지면 글과 사진이 세로로 나열된다.

### Hero Stage
- 첫 화면 사진이 170svh 동안 고정된 채 1.18 → 1로 물러나고, 무대 검정 막이 0 → 55%로 덮이며, 슬로건 묶음이 60px 올라간다. 움직임이 꺼지면 정지한 전체 화면 사진이다.

## Do's and Don'ts

### Do:
- **Do** 모든 페이지를 무대 검정(`stage`) 위의 흰 글자로 시작하고, 사진이 있으면 화면 폭으로 연다.
- **Do** 행동 버튼은 라임 알약에 코발트 글자 하나로 두고, 보조 행동은 흰 밑줄 링크로 둔다.
- **Do** 정보 묶음은 15~20% 흰 가로선과 라벨·값 순서로 나눈다.
- **Do** 사진이 없는 장면에는 코발트 방사형 조명과 거대한 숫자로 증거를 댄다.
- **Do** 임시 사진에는 반드시 "임시 사진" 표시를 단다.
- **Do** 스크롤 연출은 세로 방향으로만 움직이고, 움직임 꺼짐과 JavaScript 없음에서는 최종 상태를 보여준다.
- **Do** 날짜와 번호는 JetBrains Mono와 고정폭 숫자로 쓴다.
- **Do** 계정 화면은 코발트 조명을 위에서 비추고, 내용을 가운데 한 줄로 세운다.
- **Do** 계정 화면마다 라임 알약은 많아야 하나, 그 화면이 하려는 일(로그인 링크 받기, 가입 완료, 정보 수정, 회원으로)에만 쓴다. 나머지는 흰 테두리 알약이나 밑줄 글자 버튼이다.
- **Do** 오류는 칸 테두리를 100% 흰색으로 올리고 칸 아래에 흰 문장으로 이유를 쓴다. 위험한 행동(탈퇴, 차단)도 라임이 아니라 Outline 알약이다.
- **Do** 밑줄 글자 버튼도 누르는 영역을 44px 이상으로 잡는다.

### Don't:
- **Don't** 로고에 없는 색(남색 등)을 메인이나 강조색으로 쓰지 않는다. 잉크(`ink`)는 휴대폰 메뉴 밖으로 꺼내지 않는다.
- **Don't** 심볼 그라데이션을 진행 표시 밖(버튼, 글자, 배경 장식)에 쓰지 않는다.
- **Don't** 16:9 스크린 틀이나 슬라이드 번호를 쓰지 않는다.
- **Don't** 단체 사진 히어로 아래에 같은 모양의 카드 격자를 늘어놓지 않는다.
- **Don't** 스크롤을 내리는데 옆으로 움직이는 가로 이동 연출을 쓰지 않는다.
- **Don't** 무대 위 요소를 그림자로 띄우지 않는다. 그림자는 휴대폰 메뉴 패널에만 있다.
- **Don't** 오류에 빨강, 성공에 초록을 쓰지 않는다. 구글 "G" 표식 안의 색은 표식 밖으로 꺼내지 않는다.
- **Don't** 자리표시자로 입력칸의 라벨을 대신하지 않는다. 라벨은 칸 위에 항상 보인다.
- **Don't** 네이티브 체크박스와 라디오를 어두운 바탕에 그대로 두지 않는다. 직접 그린 Tick과 알약 선택을 쓴다.

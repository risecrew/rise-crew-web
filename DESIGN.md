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

**Key Characteristics:**
- 거의 검은 무대 바탕(`stage`) 위의 흰 글자, 색은 로고에서만 가져온다.
- 코발트는 조명, 라임은 행동과 강조, 심볼 그라데이션은 진행 표시에만.
- 실제 사진을 화면 폭으로, 아래쪽 어둠 그라데이션 위에 글자를 얹는다.
- 콘텐츠 폭을 가로지르는 장 이름과 가변 굵기의 거대한 숫자.
- 카드 대신 얇은 가로선으로 나눈 라벨·값 목록.
- 스크롤에 묶인 고정 장면 전환, 움직임 축은 언제나 세로.

## Colors

로고 원본의 코발트와 심볼 다섯 색이 팔레트의 전부이고, 나머지는 색을 갖지 않은 무대 검정과 흰 글자의 불투명도 단계다.

### Primary
- **로고 코발트** (`cobalt`): 무대 조명. 숫자 구간에서 사진을 덮는 코발트 그라데이션(82~90% 불투명), 사진 없는 Campus 장과 404 표지 아래쪽의 방사형 빛 번짐(55%), 사이트 푸터 전체 바탕, 라임 버튼 위 글자색, `accent-color`, 스크롤바 색(45% 혼합)에 쓴다.

### Secondary
- **심볼 라임** (`lime`): 켜지는 순간. 행동 버튼 바탕, 슬로건과 R·I·S·E 목록의 머리글자, Campus의 VCC 18과 Global의 대회 숫자, 강조 링크(전체 보기, 출처), 5단계 육성 플랜의 윗선과 번호, FAQ 열기 기호, 포커스 링, 선택 영역 바탕(글자는 코발트), 입력 커서에 쓴다.

### Tertiary
- **심볼 그라데이션** (`lime` → `leaf` → `teal` → `ocean`): 장 레일의 진행 막대에서만 쓴다. 데스크톱은 위에서 아래로, 휴대폰은 왼쪽에서 오른쪽으로 차오른다.
- **심볼 하늘색** (`sky`): 로고 심볼의 다섯 번째 색으로 토큰에 남아 있지만, 화면 요소에는 쓰지 않는다. 레일 그라데이션은 방향 계약대로 네 색(라임 → 초록 → 청록 → 파랑)이다.

### Neutral
- **무대 검정** (`stage`): 모든 페이지의 바탕. 색조가 거의 없는 객석의 어둠이고, 푸른 기운은 코발트 조명에서만 온다. 사진 아래쪽 어둠 그라데이션(15% → 25% → 88%), 첫 화면 사진이 물러날 때 덮는 막(최대 55%), 휴대폰 레일 바탕(85%, 배경 흐림)에도 같은 값을 쓴다.
- **무대 위 흰색** (`on-stage`, `on-stage-soft`, `on-stage-dim`): 제목과 값은 흰색 그대로, 본문과 리드 문장은 75~85%, 꺼진 레일 항목과 지나간 일정, 라벨은 55~60%.
- **무대 가로선** (`stage-rule`): 사실 목록, 일정표, 프로그램 목록을 나누는 1px 선. 장 안의 묶음은 20%, 섹션 경계는 10%로 한 단계씩 조절한다.
- **종이와 잉크** (`paper`, `paper-edge`, `ink`): 휴대폰 메뉴 패널에만 쓰는 밝은 면. 메뉴 바탕은 종이, 항목 hover와 구분선은 종이 가장자리, 글자는 잉크다. 이 패널 안에서는 포커스 링이 라임 대신 코발트로 바뀐다.

### Named Rules
**The Logo Light Rule.** 색은 로고에서만 온다. 코발트, 라임, 심볼 그라데이션 외의 색상(남색, 보라, 임의의 파랑)을 메인이나 강조로 들이지 않는다. 무대 검정은 색조가 없어야 하고, 잉크는 휴대폰 메뉴 밖으로 나오지 않는다.

**The Lime Is A Cue Rule.** 라임은 행동 버튼, 머리글자, 일부 숫자, 강조 링크와 포커스에만 켠다. 제목 전체나 넓은 면을 라임으로 칠하지 않는다.

**The Gradient Means Progress Rule.** 심볼 그라데이션은 "지금 어디까지 왔는가"를 보여주는 진행 표시에만 쓴다. 버튼, 글자, 배경 장식에 쓰지 않는다.

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
- **Headline** (850, `clamp(1.9rem, 4vw, 3.4rem)`, 1.04): 안쪽 페이지의 섹션 제목. 홈 장 안의 제목은 30px → 48px(md)로 같은 굵기를 쓴다. `text-wrap: balance`.
- **Title** (800~850, 20~30px): 프로그램 이름, 멘토 이름, 사실 값(MOU 날짜, 팀당 500만 원).
- **Body Lead** (400, 18px): 제목 아래 설명 문장. 최대 폭 42~48rem(`max-w-2xl`~`max-w-3xl`), 75% 흰색.
- **Body** (400, 16px): 일반 문단과 목록.
- **Label** (500, 14px): 사실 목록의 라벨(60% 흰색), 보도 출처 줄, 프로그램 요약.
- **Control** (600, 12px, 0.2em, 대문자): 언어 전환과 휴대폰 메뉴 버튼처럼 라틴 글자로 된 조작 요소에만.
- **Data** (JetBrains Mono, 14px): 날짜와 단계 번호(01~05). `dd`와 `time`은 전역에서 고정폭 숫자를 쓴다.

### Named Rules
**The Keep-Words Rule.** 한국어 문장과 제목은 모두 `word-break: keep-all`로 어절 단위로 줄을 바꾼다. 음절 중간에서 끊긴 한국어 제목은 결함이다.

**The Weight Is Motion Rule.** 숫자의 굵기 변화(400 → 950)는 스크롤 연출의 일부다. 움직임이 꺼진 환경에서는 처음부터 900으로 보인다.

## Layout

콘텐츠 컨테이너는 최대 1280px이고 좌우 여백은 20px, md(768px) 이상에서 40px이다. 안쪽 페이지의 섹션은 위아래 80px, md 이상 112px이며, 섹션끼리는 10% 흰 선 하나로 나뉜다. 섹션 안은 대개 lg(1024px)에서 두 열(제목과 리드 | 사실 목록)로 갈라진다.

홈의 세 장은 더 넓게 숨 쉰다. 위아래 96px, md 이상 144px. lg 이상에서는 왼쪽에 고정 레일이 서므로 장 콘텐츠의 왼쪽 여백을 240px(xl 288px)로 비운다. 휴대폰에서는 레일이 화면 위쪽 막대가 되고 왼쪽 여백은 일반 값으로 돌아온다.

사진 장면은 화면 높이 단위로 잡는다. 첫 화면은 170svh 스크롤 동안 100svh를 고정한다. Domestic 첫머리는 85svh, 안쪽 표지는 78svh(최소 560px), md 이상 88svh이며, 사진이 없는 표지는 70svh다. Global 고정 갤러리는 도시마다 100svh 스크롤을 쓰고, 마지막 도시 뒤에 0.3화면을 더 머문다. 데스크톱에서는 글과 사진을 0.85 : 1.15 두 열로, 휴대폰에서는 사진(42svh) 아래 글로 쌓는다.

**The Ruled List Rule.** 정보 묶음은 위쪽 1px 선과 16px 안쪽 여백으로 시작한다. 카드 상자나 배경 면으로 묶지 않는다.

## Elevation & Depth

평면 시스템이다. 무대 위 요소에는 그림자가 없고, 깊이는 세 가지로만 만든다. 사진 아래쪽을 무대 검정으로 어둡게 하는 세로 그라데이션, 코발트 조명의 방사형 번짐, 그리고 스크롤에 묶인 크기 변화(첫 화면 1.18 → 1, Global 사진 1.12 → 1)다. 화면 위에 떠야 하는 것(휴대폰 레일, 임시 사진 표시)은 반투명 바탕과 배경 흐림으로 띄운다.

### Shadow Vocabulary
- **메뉴 패널 그림자** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): 휴대폰 메뉴 패널 하나에만 쓴다. 밝은 종이 패널이 어두운 무대 위에 열리는 유일한 떠 있는 면이다.

### Named Rules
**The Light, Not Lift Rule.** 무대에서 무언가를 강조할 때는 그림자로 띄우지 않고 빛(코발트 번짐, 라임)으로 비춘다.

## Shapes

형태 언어는 두 가지다. 상호작용하는 작은 요소는 완전한 알약형(9999px)이다: 행동 버튼, 임시 사진 표시, 운영진·파트너 칩, 일정 상태 표시. 사진은 화면 폭이면 모서리가 없고, 콘텐츠 폭 안에 놓인 사진 틀(Global 갤러리)과 휴대폰 메뉴 패널만 8px로 살짝 둥글린다. 4px는 휴대폰 메뉴 버튼, 건너뛰기 링크, 파트너 로고 받침 같은 작은 보조 요소에만 쓴다. 나머지 구조는 모서리 없이 가로선으로 나눈다.

## Components

### Buttons
무대 위에서 유일하게 켜진 버튼. 자신 있고 손에 잡힌다.
- **Shape:** 완전한 알약형(9999px).
- **Primary:** 라임 바탕에 코발트 글자, 600 굵기, 12px 24px. 지원하기(모집 중) 또는 모집 안내 보기(모집 기간 아님) 한 가지 행동만 맡는다. 헤더와 휴대폰 메뉴에서는 8px 16px의 작은 판을 쓴다.
- **Hover / Focus:** hover에서 2px 떠오르고, 누르면 0.97로 줄어든다(150ms, ease-out). 포커스는 2px 라임 외곽선, 3px 간격.
- **Secondary:** 버튼 옆의 보조 행동(제휴 문의)은 버튼이 아니라 흰 글자 밑줄 링크다. 밑줄 간격 4px.

### Chips
- **Style:** 20~25% 흰 테두리 알약, 투명 바탕, 14px 600. 운영진 직함, 파트너 이름, 일정 상태(예정, 미확정)에 쓴다.
- **State:** 상태를 바꾸지 않는 표시용이다.

### Ruled Fact List
발표 자료 부록처럼 라벨 위, 값 아래.
- **Style:** 각 행은 위쪽 15% 흰 선, 16px 위아래 여백. 라벨은 14px 500(60% 흰색), 값은 18px 600 흰색. 넓은 화면에서 두 열로 나눌 수 있다.
- **Timeline variant:** 날짜(Mono, 60%) · 장소(600) · 행사명의 세 열. 아직 일어나지 않았거나 확인되지 않은 일정은 줄 전체를 60%로 낮추고 상태 칩을 단다.

### Navigation
- **Site header:** 사진 위에 투명하게 겹친다. 흰 심볼과 RISE CREW 워드마크(Wanted Sans 800), 오른쪽에 흰 글자 링크(hover 밑줄), 대문자 언어 전환, 작은 라임 버튼.
- **Mobile:** md 미만에서는 "MENU" 테두리 버튼(4px, 50% 흰 테두리)이 종이 바탕 패널을 연다. 패널은 잉크 글자, 항목 hover는 종이 가장자리, 아래에 코발트 언어 전환과 라임 버튼.
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

### Don't:
- **Don't** 로고에 없는 색(남색 등)을 메인이나 강조색으로 쓰지 않는다. 잉크(`ink`)는 휴대폰 메뉴 밖으로 꺼내지 않는다.
- **Don't** 심볼 그라데이션을 진행 표시 밖(버튼, 글자, 배경 장식)에 쓰지 않는다.
- **Don't** 16:9 스크린 틀이나 슬라이드 번호를 쓰지 않는다.
- **Don't** 단체 사진 히어로 아래에 같은 모양의 카드 격자를 늘어놓지 않는다.
- **Don't** 스크롤을 내리는데 옆으로 움직이는 가로 이동 연출을 쓰지 않는다.
- **Don't** 무대 위 요소를 그림자로 띄우지 않는다. 그림자는 휴대폰 메뉴 패널에만 있다.

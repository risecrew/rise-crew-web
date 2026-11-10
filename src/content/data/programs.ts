import type { Program } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

// What each stage runs, in order (wireframe v1.1, §10). SKKU SPEC's tracks are no longer part of it.
export const programs: Program[] = [
  {
    id: 'vcc',
    stage: 'campus',
    name: L('VCC (Venture Creation Course)', 'VCC (Venture Creation Course)'),
    meta: L('18회차 · 카카오모빌리티 공동 개발', '18 sessions · co-developed with Kakao Mobility'),
    summary: L(
      '카카오모빌리티와 함께 만든 실전 창업 교육입니다.',
      'A hands-on venture course built with Kakao Mobility.',
    ),
    details: [
      L(
        '기본기 트랙: 재무·회계, MVP 만들기, 기술 트렌드',
        'Basics track: finance and accounting, building an MVP, tech trends',
      ),
      L('CEO 트랙: 기업가정신과 리더십', 'CEO track: entrepreneurship and leadership'),
      L(
        'SCALE UP 트랙: 정부지원사업 이해와 성장 전략',
        'Scale-up track: government programs and growth strategy',
      ),
      L(
        'VC 트랙: 투자자 관점의 사업성 분석',
        "VC track: business analysis from an investor's view",
      ),
      L(
        '선배 창업가 트랙: 창업 경험과 의사결정 사례',
        'Founder track: stories and decisions from alumni founders',
      ),
    ],
  },
  {
    id: 'mentoring',
    stage: 'campus',
    name: L('전문 멘토단 1:1 멘토링', '1:1 mentoring'),
    meta: L('멘토 33명', '33 mentors'),
    summary: L(
      '현직 전문가가 아이디어부터 투자와 해외 진출까지 함께합니다.',
      'Working professionals support teams from idea to fundraising and global expansion.',
    ),
    details: [],
  },
  {
    // TODO(운영진 확인): how this runs.
    id: 'team-building',
    stage: 'campus',
    name: L('팀 빌딩과 정기 세미나', 'Team building and seminars'),
    summary: L(
      '다양한 전공의 팀원과 팀을 꾸리고, 정기 세미나로 최신 흐름을 익힙니다.',
      'Form a team across majors and keep up with regular trend seminars.',
    ),
    details: [],
  },
  {
    // TODO(운영진 확인): the official name and how often it runs.
    id: 'roundtable',
    stage: 'domestic',
    name: L('창업팀 라운드테이블 워크숍', 'Startup team roundtable workshop'),
    meta: L('1박 2일 멘토링 워크숍', 'A two-day mentoring workshop'),
    summary: L(
      '창업팀이 멘토와 함께 사업 아이템을 다듬고 발표합니다.',
      'Teams refine and pitch their business with mentors.',
    ),
    details: [],
  },
  {
    id: 'seongchangjae',
    stage: 'domestic',
    name: L('성창재 우수 창업팀 육성', 'Seongchangjae incubation'),
    meta: L('선발 팀당 사업화 자금 500만 원', 'KRW 5 million per selected team'),
    summary: L(
      '선발된 우수 창업팀의 사업화를 단계별로 지원합니다.',
      'Step-by-step commercialization support for selected teams.',
    ),
    details: [
      L(
        'BM 수립 → 사업화 검증 → 사업화 지원 → 후속 지원',
        'Business model → validation → commercialization support → follow-up support',
      ),
    ],
  },
  {
    id: 'funding',
    stage: 'domestic',
    name: L('사업화와 투자 유치', 'Commercialization and fundraising'),
    summary: L(
      '법인 설립부터 투자 연계까지 함께합니다.',
      'From incorporation to investor introductions.',
    ),
    details: [
      L('법인 설립 행정 지원', 'Administrative support for incorporation'),
      L(
        '예비창업패키지 등 정부지원사업 공모 지원',
        'Applications to government startup programs such as the Pre-Startup Package',
      ),
      L(
        'VC 하우스 입주 프로그램 연계 (마루360, 프론트원)',
        'Links to VC house programs (MARU360, Front1)',
      ),
      L('IR 피칭과 pre-SEED 투자 연계', 'IR pitching and pre-seed investment links'),
    ],
  },
  {
    id: 'expos',
    stage: 'global',
    name: L('해외 전시·박람회', 'Overseas expos and fairs'),
    summary: L('해외 무대에서 팀의 제품을 직접 선보입니다.', 'Teams show their products abroad.'),
    details: [
      L(
        'FTU TECHFEST, Sushi Tech Tokyo, BEYOND Expo',
        'FTU TECHFEST, Sushi Tech Tokyo, BEYOND Expo',
      ),
    ],
  },
  {
    id: 'joint-programs',
    stage: 'global',
    name: L('해외 대학 공동 프로그램', 'Joint programs with universities abroad'),
    summary: L(
      '해외 대학과 함께 짧고 굵은 공동 프로그램을 엽니다.',
      'Short, intensive programs run with universities abroad.',
    ),
    details: [
      L('SMU × SKKU AI 바이브코딩 스프린트 등', 'SMU × SKKU AI Vibe Coding Sprint and more'),
    ],
  },
  {
    id: 'global-ir',
    stage: 'global',
    name: L('글로벌 IR', 'Global IR'),
    summary: L('해외 투자자 앞에서 투자 유치에 나섭니다.', 'Teams pitch to investors abroad.'),
    details: [
      L('아시아 IR 투어', 'Asia IR tours'),
      L('런던·쿠알라룸푸르 투자 유치', 'Fundraising in London and Kuala Lumpur'),
    ],
  },
  {
    id: 'patents',
    stage: 'global',
    name: L('해외 특허 지원', 'International patent support'),
    summary: L('해외 진출에 필요한 특허 출원을 돕습니다.', 'Help with filing patents abroad.'),
    details: [],
  },
];

import type { Program } from '@/content/schema';

export const programs: Program[] = [
  {
    id: 'vcc',
    stage: 'campus',
    name: { ko: 'VCC (Venture Creation Course)', en: 'VCC (Venture Creation Course)' },
    summary: {
      ko: '카카오모빌리티와 함께 만든 18회차 실전 창업 교육',
      en: 'An 18-session venture course co-developed with Kakao Mobility',
    },
    details: [
      {
        ko: '기본기 트랙: 재무·회계, MVP 만들기, 기술 트렌드',
        en: 'Basics track: finance and accounting, building an MVP, tech trends',
      },
      { ko: 'CEO 트랙: 기업가정신과 리더십', en: 'CEO track: entrepreneurship and leadership' },
      {
        ko: 'SCALE UP 트랙: 정부지원사업 이해와 성장 전략',
        en: 'Scale-up track: government programs and growth strategy',
      },
      {
        ko: 'VC 트랙: 투자자 관점의 사업성 분석',
        en: "VC track: business analysis from an investor's view",
      },
      {
        ko: '선배 창업가 트랙: 창업 경험과 의사결정 사례',
        en: 'Founder track: stories and decisions from alumni founders',
      },
    ],
  },
  {
    id: 'mentoring',
    stage: 'campus',
    name: { ko: '전문 멘토단 1:1 멘토링', en: '1:1 mentoring' },
    summary: {
      ko: '멘토 33명이 아이디어부터 투자와 해외 진출까지 함께합니다',
      en: '33 mentors support teams from idea to fundraising and global expansion',
    },
    details: [],
  },
  {
    id: 'tracks',
    stage: 'campus',
    name: { ko: 'Learner · Preneur 트랙', en: 'Learner and Preneur tracks' },
    summary: { ko: 'SKKU SPEC과 협력하는 두 갈래 과정', en: 'Two tracks run with SKKU SPEC' },
    details: [
      {
        ko: '러너: 1학기 필수 과정. 5단계 커리큘럼으로 팀 프로젝트를 진행합니다',
        en: 'Learner: a required first-semester course with a five-step team project curriculum',
      },
      {
        ko: '프러너: 러너 수료생과 예비·초기 창업가의 자율 창업 활동과 네트워킹을 지원합니다',
        en: 'Preneur: self-directed venture work and networking for Learner graduates and early founders',
      },
    ],
  },
  {
    id: 'seongchangjae',
    stage: 'domestic',
    name: { ko: '성창재', en: 'Seongchangjae' },
    summary: {
      ko: '우수 창업팀 육성 프로그램. 선발 팀당 사업화 자금 500만 원',
      en: 'Incubation for selected teams, with KRW 5 million in commercialization funding per team',
    },
    details: [
      {
        ko: 'BM 수립 → 사업화 검증 → 사업화 지원 → 후속 지원',
        en: 'Business model → validation → commercialization support → follow-up support',
      },
    ],
  },
  {
    id: 'funding',
    stage: 'domestic',
    name: { ko: '사업화와 투자 유치', en: 'Commercialization and fundraising' },
    summary: {
      ko: '법인 설립, 정부지원사업, IR 피칭과 pre-SEED 투자 연계',
      en: 'Incorporation, government programs, IR pitching and pre-seed investment links',
    },
    details: [
      { ko: '법인 설립 행정 지원', en: 'Administrative support for incorporation' },
      {
        ko: '예비창업패키지 등 정부지원사업 공모 지원',
        en: 'Applications to government startup programs',
      },
      {
        ko: 'VC 하우스 입주 프로그램 연계 (마루360, 프론트원)',
        en: 'Links to VC house programs (MARU360, Front1)',
      },
    ],
  },
  {
    id: 'global-programs',
    stage: 'global',
    name: { ko: '글로벌 프로그램', en: 'Global programs' },
    summary: {
      ko: '해외 전시회, 아시아 IR 투어, 해외 대학 공동 프로그램, 해외 특허 지원',
      en: 'Overseas expos, Asia IR tours, joint programs with universities abroad, and international patent support',
    },
    details: [],
  },
];

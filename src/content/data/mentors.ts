import type { Mentor } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
const kakao = L('카카오모빌리티', 'Kakao Mobility');
const anchor = L('성균관대학교 ANCHOR 사업단', 'SKKU ANCHOR Division');
const simsan = L('심산벤처스', 'Simsan Ventures');

export const mentors: Mentor[] = [
  {
    id: 'ko-kyungsun',
    featured: true,
    name: L('고경선', 'Ko Kyungsun'),
    org: kakao,
    role: L(
      '이사 · 창업학 박사, 단국대 겸임교수',
      'Director · PhD in entrepreneurship, adjunct professor at Dankook University',
    ),
    expertise: [
      L('벤처 창업', 'Venture creation'),
      L('정부지원사업', 'Government startup programs'),
    ],
  },
  {
    id: 'kim-jongsu',
    featured: true,
    name: L('김종수', 'Kim Jongsu'),
    org: kakao,
    role: L(
      '사업기획팀장 · 성균관대 박사과정',
      'Head of business planning · PhD candidate at SKKU',
    ),
    expertise: [
      L('기술사업화', 'Technology commercialization'),
      L('경영 컨설팅', 'Management consulting'),
      L('오픈이노베이션', 'Open innovation'),
    ],
  },
  {
    id: 'park-cheolsu',
    featured: false,
    name: L('박철수', 'Park Cheolsu'),
    org: L('아워박스', 'Ourbox'),
    role: L('대표 · 시리즈C 스마트물류 스타트업', 'CEO · Series C smart logistics startup'),
    expertise: [L('SCM', 'SCM'), L('스마트물류', 'Smart logistics'), L('이커머스', 'E-commerce')],
  },
  {
    id: 'chae-seungho',
    featured: false,
    name: L('채승호', 'Chae Seungho'),
    org: L('넥스트랜스', 'Nextrans'),
    role: L('상무 · VC 투자, 해외 투자', 'Managing director · VC and overseas investment'),
    expertise: [
      L('초기 투자', 'Early-stage investment'),
      L('후속 투자', 'Follow-on investment'),
      L('글로벌 투자(베트남)', 'Global investment (Vietnam)'),
    ],
  },
  {
    id: 'jung-soonjin',
    featured: false,
    name: L('정순진', 'Jung Soonjin'),
    org: L('경영안전진흥원', 'Business Safety Promotion Institute'),
    role: L('대표 · 재무·세무 전문가', 'CEO · Finance and tax expert'),
    expertise: [L('재무', 'Finance'), L('세무', 'Tax')],
  },
  {
    id: 'jang-seonghwan',
    featured: false,
    name: L('장성환', 'Jang Seonghwan'),
    org: L('베론글로벌', 'Veron Global'),
    role: L(
      '대표 · IBM, 구글, 네오위즈, 카카오 출신 투자자',
      'CEO · Investor formerly at IBM, Google, Neowiz and Kakao',
    ),
    expertise: [L('초기 투자', 'Early-stage investment'), L('스케일업', 'Scale-up')],
  },
  {
    id: 'shin-dongwon',
    featured: false,
    name: L('신동원', 'Shin Dongwon'),
    org: anchor,
    role: L('교수 · 전 다음차이나 대표', 'Professor · Former CEO of Daum China'),
    expertise: [
      L('초기 투자', 'Early-stage investment'),
      L('팀 빌딩', 'Team building'),
      L('글로벌 진출', 'Global expansion'),
    ],
  },
  {
    id: 'lee-jonghwi',
    featured: false,
    name: L('이종휘', 'Lee Jonghwi'),
    org: L('임팩트앤코', 'Impact&Co'),
    role: L('대표 · 비즈니스 리서처', 'CEO · Business researcher'),
    expertise: [
      L('IR', 'IR'),
      L('피치덱', 'Pitch decks'),
      L('스피치', 'Public speaking'),
      L('정부지원사업', 'Government startup programs'),
    ],
  },
  {
    id: 'kim-seho',
    featured: false,
    name: L('김세호', 'Kim Seho'),
    org: L('미디어제네레이션', 'Media Generation'),
    role: L(
      '대표 · 피엠솔루션·인터레스트·아이벤처스 공동창업자',
      'CEO · Co-founder of PM Solution, Interest and iVentures',
    ),
    expertise: [L('정부지원사업 심사', 'Government program review')],
  },
  {
    id: 'jung-gyeongjin',
    featured: false,
    name: L('정경진', 'Jung Gyeongjin'),
    org: L('데이터방앗간', 'Data Bangatgan'),
    role: L('대표 · PM 전문가, 기획자', 'CEO · Product manager and planner'),
    expertise: [L('MVP', 'MVP'), L('기획', 'Product planning')],
  },
  {
    id: 'han-wooduk',
    featured: false,
    name: L('한우덕', 'Han Wooduk'),
    org: L('중앙일보', 'JoongAng Ilbo'),
    role: L('기자 · 차이나랩 대표', 'Journalist · Head of China Lab'),
    expertise: [
      L('중국 대기업·기관 네트워크', 'Network with major Chinese companies and institutions'),
    ],
  },
  {
    id: 'kim-youngchae',
    featured: false,
    name: L('김영채', 'Kim Youngchae'),
    org: L('KM Solution', 'KM Solution'),
    role: L('대표 · 포털 출신 미디어 전문가', 'CEO · Media expert from the portal industry'),
    expertise: [L('리더십', 'Leadership'), L('미디어·콘텐츠', 'Media and content')],
  },
  {
    id: 'bae-soongu',
    featured: false,
    name: L('배순구', 'Bae Soongu'),
    org: L('다래전략사업화센터', 'Darae Strategic Commercialization Center'),
    role: L('대표 · 변리사', 'CEO · Patent attorney'),
    expertise: [
      L('엔젤 투자', 'Angel investment'),
      L('기술사업화', 'Technology commercialization'),
      L('특허', 'Patents'),
    ],
  },
  {
    id: 'lee-seunghwa',
    featured: false,
    name: L('이승화', 'Lee Seunghwa'),
    org: simsan,
    role: L('대표 · 해외 전문 액셀러레이터', 'CEO · Global-focused accelerator'),
    expertise: [
      L('해외 진출 액셀러레이팅', 'Global acceleration'),
      L('시드 투자', 'Seed investment'),
    ],
  },
  {
    id: 'ha-jiwon',
    featured: false,
    name: L('하지원', 'Ha Jiwon'),
    org: simsan,
    role: L('이사 · 해외 전문 액셀러레이터', 'Director · Global-focused accelerator'),
    expertise: [
      L('해외 진출 액셀러레이팅', 'Global acceleration'),
      L('시드 투자', 'Seed investment'),
    ],
  },
  {
    id: 'seol-sanghun',
    featured: false,
    name: L('설상훈', 'Seol Sanghun'),
    org: anchor,
    role: L('교수 · UI/UX, 제품 디자인 전문가', 'Professor · UI/UX and product design expert'),
    expertise: [L('프로덕트 핏', 'Product fit'), L('제품 제작', 'Product development')],
  },
  {
    id: 'bae-junhak',
    featured: false,
    name: L('배준학', 'Bae Junhak'),
    org: L('오라클인베스트먼트', 'Oracle Investment'),
    role: L('대표 · 투자 유치, 투자 강의', 'CEO · Fundraising and investment lecturer'),
    expertise: [
      L('창업투자론', 'Startup investment'),
      L('BM 피봇', 'Business model pivots'),
      L('IR 덱', 'IR decks'),
      L('글로벌 진출', 'Global expansion'),
    ],
  },
  {
    id: 'jung-yongjun',
    featured: false,
    name: L('정용준', 'Jung Yongjun'),
    org: anchor,
    role: L(
      '교수 · 네이버, 카카오 출신 PMF 전문가',
      'Professor · PMF expert formerly at Naver and Kakao',
    ),
    expertise: [L('PMF', 'PMF'), L('BM', 'Business models'), L('서비스 기획', 'Service planning')],
  },
  {
    id: 'shin-dongjun',
    featured: false,
    name: L('신동준', 'Shin Dongjun'),
    org: L('(전) EY', 'Formerly EY'),
    role: L('파트너 · 컨설턴트', 'Partner · Consultant'),
    expertise: [
      L('컨설팅', 'Consulting'),
      L('커리어 관리', 'Career management'),
      L('창업가 마인드 관리', 'Founder mindset'),
    ],
  },
];

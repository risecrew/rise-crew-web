import type { Partner } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
// A name with no confirmed English form is shown in Korean on the English pages too, as names are
// (wireframe v1.1, §19). TODO(운영진 확인): the English name.
const koOnly = (ko: string) => L(ko, ko);

const KR = L('한국', 'Korea');

// The 25 partners (wireframe v1.1, §13): supporters, then universities, then companies, each in the
// order the organizers listed them. No logo file is approved yet, so the home's logo band stays
// hidden and the network page shows the names.
export const partners: Partner[] = [
  {
    id: 'anchor',
    kind: 'supporter',
    name: L('성균관대학교 앵커사업단', 'SKKU ANCHOR Division'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'seoul-anchor-center',
    kind: 'supporter',
    name: koOnly('서울앵커센터'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'ftu',
    kind: 'university',
    name: L('하노이외상대학교', 'Foreign Trade University (FTU)'),
    country: L('베트남', 'Vietnam'),
    logoApproved: false,
  },
  {
    id: 'hust',
    kind: 'university',
    name: L('하노이과학기술대학교', 'Hanoi University of Science and Technology (HUST)'),
    country: L('베트남', 'Vietnam'),
    logoApproved: false,
  },
  {
    id: 'hznu',
    kind: 'university',
    name: L('항저우사범대학교', 'Hangzhou Normal University (HZNU)'),
    country: L('중국', 'China'),
    logoApproved: false,
  },
  {
    id: 'hosei',
    kind: 'university',
    name: L('호세이대학교', 'Hosei University'),
    country: L('일본', 'Japan'),
    logoApproved: false,
  },
  {
    id: 'monash-malaysia',
    kind: 'university',
    name: L('모나쉬대학교 말레이시아', 'Monash University Malaysia'),
    country: L('말레이시아', 'Malaysia'),
    logoApproved: false,
  },
  {
    id: 'smu',
    kind: 'university',
    name: L('싱가포르경영대학교', 'Singapore Management University (SMU)'),
    country: L('싱가포르', 'Singapore'),
    logoApproved: false,
  },
  {
    id: 'toronto',
    kind: 'university',
    name: L('토론토대학교', 'University of Toronto'),
    country: L('캐나다', 'Canada'),
    logoApproved: false,
  },
  {
    id: 'yonsei',
    kind: 'university',
    name: L('연세대학교 창업지원단', 'Yonsei University Startup Support Center'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'kakao-mobility',
    kind: 'company',
    name: L('카카오모빌리티', 'Kakao Mobility'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'darae',
    kind: 'company',
    name: L('다래전략사업화센터', 'Darae Strategic Commercialization Center'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'startup-alliance',
    kind: 'company',
    name: L('스타트업얼라이언스', 'Startup Alliance'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'ourbox',
    kind: 'company',
    name: L('아워박스', 'OURBOX'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'veron-global',
    kind: 'company',
    name: koOnly('베론글로벌'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'one-degree-labs',
    kind: 'company',
    name: koOnly('원디그리랩스'),
    country: KR,
    logoApproved: false,
  },
  // TODO(운영진 확인): the country.
  { id: 'outsome', kind: 'company', name: L('아웃썸', 'Outsome'), logoApproved: false },
  {
    id: 'nextrans',
    kind: 'company',
    name: L('넥스트랜스', 'Nextrans'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'simsan-ventures',
    kind: 'company',
    name: koOnly('심산벤처스'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'oracle-investment',
    kind: 'company',
    name: koOnly('오라클인베스트먼트'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'lotte-ventures',
    kind: 'company',
    name: L('롯데벤처스', 'Lotte Ventures'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'daekyo-investment',
    kind: 'company',
    name: L('대교인베스트먼트', 'Daekyo Investment'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'kiwoom-investment',
    kind: 'company',
    name: L('키움인베스트먼트', 'Kiwoom Investment'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'joongang-china-lab',
    kind: 'company',
    name: L('중앙일보 차이나랩', 'JoongAng Ilbo China Lab'),
    country: KR,
    logoApproved: false,
  },
  {
    id: 'emc-global',
    kind: 'company',
    name: L('EMC 글로벌', 'EMC Global'),
    country: L('일본', 'Japan'),
    logoApproved: false,
  },
];

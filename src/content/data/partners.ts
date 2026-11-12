import type { Partner } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
// A name with no confirmed English form is shown in Korean on the English pages too, as names are
// (wireframe v1.1, §19). TODO(운영진 확인): the English name.

const KR = L('한국', 'Korea');

// The 25 partners (wireframe v1.1, §13): supporters, then universities, then companies, each in the
// order the organizers listed them. The logo files a teammate gathered are in place, but
// none is approved for showing yet, so the home's logo band stays hidden and the network page shows
// the names. Four came from the partners' own sites (2026-11). Kakao Mobility's is its CI from Kakao's own press
// release. The ANCHOR Project Group's is the one
// on its booth at the 2026 university-industry expo (uicexpo.org). TODO(운영진 확인): approval.
export const partners: Partner[] = [
  {
    id: 'anchor',
    kind: 'supporter',
    name: L('성균관대학교 앵커사업단', 'Seoul ANCHOR Project Group'),
    country: KR,
    logo: '/images/partners/anchor.png',
    logoApproved: false,
  },
  {
    id: 'seoul-anchor-center',
    kind: 'supporter',
    // The city's center, formerly the Seoul RISE Center; the program is now called ANCHOR.
    name: L('서울앵커센터', 'Seoul ANCHOR Center'),
    country: KR,
    logo: '/images/partners/seoul-anchor-center.svg',
    logoApproved: false,
  },
  {
    id: 'ftu',
    kind: 'university',
    name: L('하노이외상대학교', 'Foreign Trade University (FTU)'),
    country: L('베트남', 'Vietnam'),
    logo: '/images/partners/ftu.png',
    logoApproved: false,
  },
  {
    id: 'hust',
    kind: 'university',
    name: L('하노이과학기술대학교', 'Hanoi University of Science and Technology (HUST)'),
    country: L('베트남', 'Vietnam'),
    logo: '/images/partners/hust.svg',
    logoApproved: false,
  },
  {
    id: 'hznu',
    kind: 'university',
    name: L('항저우사범대학교', 'Hangzhou Normal University (HZNU)'),
    country: L('중국', 'China'),
    logo: '/images/partners/hznu.png',
    logoApproved: false,
  },
  {
    id: 'hosei',
    kind: 'university',
    name: L('호세이대학교', 'Hosei University'),
    country: L('일본', 'Japan'),
    logo: '/images/partners/hosei.svg',
    logoApproved: false,
  },
  {
    id: 'monash-malaysia',
    kind: 'university',
    name: L('모나쉬대학교 말레이시아', 'Monash University Malaysia'),
    country: L('말레이시아', 'Malaysia'),
    logo: '/images/partners/monash-malaysia.svg',
    logoApproved: false,
  },
  {
    id: 'smu',
    kind: 'university',
    name: L('싱가포르경영대학교', 'Singapore Management University (SMU)'),
    country: L('싱가포르', 'Singapore'),
    logo: '/images/partners/smu.svg',
    logoApproved: false,
  },
  {
    id: 'toronto',
    kind: 'university',
    name: L('토론토대학교', 'University of Toronto'),
    country: L('캐나다', 'Canada'),
    logo: '/images/partners/toronto.svg',
    logoApproved: false,
  },
  {
    id: 'yonsei',
    kind: 'university',
    name: L('연세대학교 창업지원단', 'Yonsei Enterprise Support Foundation'),
    country: KR,
    logo: '/images/partners/yonsei.png',
    logoApproved: false,
  },
  {
    id: 'kakao-mobility',
    kind: 'company',
    name: L('카카오모빌리티', 'Kakao Mobility'),
    country: KR,
    logo: '/images/partners/kakao-mobility.png',
    logoApproved: false,
  },
  {
    id: 'darae',
    kind: 'company',
    name: L('다래전략사업화센터', 'Darae Strategic Commercialization Center'),
    country: KR,
    logo: '/images/partners/darae.png',
    logoApproved: false,
  },
  {
    id: 'startup-alliance',
    kind: 'company',
    name: L('스타트업얼라이언스', 'Startup Alliance'),
    country: KR,
    logo: '/images/partners/startup-alliance.png',
    logoApproved: false,
  },
  {
    id: 'ourbox',
    kind: 'company',
    name: L('아워박스', 'Ourbox'),
    country: KR,
    logo: '/images/partners/ourbox.png',
    logoApproved: false,
  },
  {
    id: 'veron-global',
    kind: 'company',
    name: L('베론글로벌', 'Veron Global'),
    country: KR,
    logo: '/images/partners/veron-global.png',
    logoApproved: false,
  },
  {
    id: 'one-degree-labs',
    kind: 'company',
    name: L('원디그리랩스', 'One Degree Labs'),
    country: KR,
    logo: '/images/partners/one-degree-labs.svg',
    logoApproved: false,
  },
  // Offices in Songdo, Incheon and Delaware, USA (outsome.co).
  {
    id: 'outsome',
    kind: 'company',
    name: L('아웃썸', 'Outsome'),
    country: L('한국·미국', 'Korea and the US'),
    logo: '/images/partners/outsome.svg',
    logoApproved: false,
  },
  {
    id: 'nextrans',
    kind: 'company',
    name: L('넥스트랜스', 'Nextrans'),
    country: KR,
    logo: '/images/partners/nextrans.png',
    logoApproved: false,
  },
  {
    id: 'simsan-ventures',
    kind: 'company',
    name: L('심산벤처스', 'Simsan Ventures'),
    country: KR,
    logo: '/images/partners/simsan-ventures.png',
    logoApproved: false,
  },
  {
    id: 'oracle-venture-investment',
    kind: 'company',
    name: L('오라클벤처투자', 'Oracle Venture Investment'),
    country: KR,
    logo: '/images/partners/oracle-venture-investment.png',
    logoApproved: false,
  },
  {
    id: 'lotte-ventures',
    kind: 'company',
    name: L('롯데벤처스', 'Lotte Ventures'),
    country: KR,
    logo: '/images/partners/lotte-ventures.png',
    logoApproved: false,
  },
  {
    id: 'daekyo-investment',
    kind: 'company',
    name: L('대교인베스트먼트', 'Daekyo Investment'),
    country: KR,
    logo: '/images/partners/daekyo-investment.png',
    logoApproved: false,
  },
  {
    id: 'kiwoom-investment',
    kind: 'company',
    name: L('키움인베스트먼트', 'Kiwoom Investment'),
    country: KR,
    logo: '/images/partners/kiwoom-investment.png',
    logoApproved: false,
  },
  {
    id: 'joongang-china-lab',
    kind: 'company',
    name: L('중앙일보 차이나랩', 'JoongAng Ilbo China Lab'),
    country: KR,
    logo: '/images/partners/joongang-china-lab.png',
    logoApproved: false,
  },
  {
    id: 'emc-global',
    kind: 'company',
    name: L('EMC 글로벌', 'EMC Global'),
    country: L('일본', 'Japan'),
    logo: '/images/partners/emc-global.svg',
    logoApproved: false,
  },
];

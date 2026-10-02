import type { Partner } from '@/content/schema';

export const partners: Partner[] = [
  {
    id: 'anchor',
    kind: 'supporter',
    name: { ko: '성균관대학교 ANCHOR 사업단', en: 'SKKU ANCHOR Division' },
    logoApproved: false,
  },
  {
    id: 'seoul-rise-center',
    kind: 'supporter',
    name: { ko: '서울RISE센터', en: 'Seoul RISE Center' },
    logoApproved: false,
  },
  {
    id: 'kakao-mobility',
    kind: 'company',
    name: { ko: '카카오모빌리티', en: 'Kakao Mobility' },
    logoApproved: false,
  },
  {
    id: 'darae',
    kind: 'company',
    name: { ko: '다래전략사업화센터', en: 'Darae Strategic Commercialization Center' },
    logoApproved: false,
  },
  {
    id: 'smu',
    kind: 'university',
    name: { ko: '싱가포르경영대학교(SMU)', en: 'Singapore Management University (SMU)' },
    logoApproved: false,
  },
  {
    id: 'yonsei',
    kind: 'university',
    name: { ko: '연세대학교 창업지원단', en: 'Yonsei University Startup Support Center' },
    logoApproved: false,
  },
  {
    id: 'spec',
    kind: 'program',
    name: { ko: 'SKKU SPEC', en: 'SKKU SPEC' },
    url: 'https://skku-spec.com/',
    logoApproved: false,
  },
];

import type { Stat } from '@/content/schema';

// One date for every number on the home (wireframe v1.1, C6).
// TODO(운영진 확인): the date and the member count.
const AS_OF = { ko: '2026.11 기준', en: 'As of Nov 2026' };

export const stats: Stat[] = [
  {
    id: 'members',
    value: '90+',
    label: { ko: '멤버', en: 'Members' },
    basis: AS_OF,
  },
  {
    id: 'teams',
    value: '25',
    label: { ko: '창업팀', en: 'Startup teams' },
    basis: AS_OF,
  },
  {
    id: 'mentors',
    value: '33',
    label: { ko: '멘토', en: 'Mentors' },
    basis: AS_OF,
  },
  {
    id: 'vcc-sessions',
    value: '18',
    label: { ko: 'VCC 실전 창업 교육 회차', en: 'VCC sessions' },
    basis: { ko: '카카오모빌리티 공동 커리큘럼', en: 'Co-developed with Kakao Mobility' },
  },
  {
    id: 'contest-countries',
    value: '5',
    label: { ko: '참가국', en: 'Countries' },
    basis: {
      ko: 'AI+X 글로벌 창업경진대회 2026.01',
      en: 'AI+X Global Startup Competition, Jan 2026',
    },
  },
  {
    id: 'contest-teams',
    value: '15',
    label: { ko: '본선 진출 팀', en: 'Finalist teams' },
    basis: {
      ko: 'AI+X 글로벌 창업경진대회 2026.01',
      en: 'AI+X Global Startup Competition, Jan 2026',
    },
  },
];

import type { Stat } from '@/content/schema';

export const stats: Stat[] = [
  {
    id: 'members',
    value: '90+',
    label: { ko: '멤버', en: 'Members' },
    basis: { ko: '2026.01 기준', en: 'As of Jan 2026' },
  },
  {
    id: 'teams',
    value: '22+',
    label: { ko: '창업팀', en: 'Startup teams' },
    basis: { ko: '2026.01 기준', en: 'As of Jan 2026' },
  },
  {
    id: 'mentors',
    value: '33',
    label: { ko: '멘토', en: 'Mentors' },
    basis: { ko: '2026.03 2기 OT 기준', en: 'As of the Mar 2026 orientation' },
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

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
];

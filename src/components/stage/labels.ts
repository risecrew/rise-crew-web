export type FieldLabel = { ko: string; en: string };

// Passport data pages always print both languages, whatever the page locale.
export const FIELD = {
  name: { ko: '명칭', en: 'Name' },
  affiliation: { ko: '소속', en: 'Affiliation' },
  established: { ko: '설립', en: 'Established' },
  supporter: { ko: '지원 기관', en: 'Supported by' },
  partnership: { ko: '협약', en: 'Partnership' },
  members: { ko: '멤버', en: 'Members' },
  teams: { ko: '창업팀', en: 'Startup teams' },
  mentors: { ko: '멘토', en: 'Mentors' },
  person: { ko: '성명', en: 'Name' },
  org: { ko: '소속', en: 'Organization' },
  role: { ko: '직함', en: 'Title' },
  expertise: { ko: '전문 분야', en: 'Expertise' },
  email: { ko: '이메일', en: 'Email' },
  address: { ko: '주소', en: 'Address' },
  status: { ko: '상태', en: 'Status' },
  period: { ko: '기간', en: 'Period' },
  goal: { ko: '목표', en: 'Goal' },
  brand: { ko: '사업 브랜드', en: 'Program brand' },
  notice: { ko: '안내', en: 'Notice' },
} as const satisfies Record<string, FieldLabel>;

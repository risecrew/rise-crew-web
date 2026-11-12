import type { Recruitment } from '@/content/schema';

export const recruitment: Recruitment = {
  status: 'closed',
  // The organizers' notice for cohort 3 (2026-11).
  nextNotice: {
    when: {
      ko: '3기 정기 모집은 2027년 상반기에 진행됩니다.',
      en: 'Cohort 3 recruits in the first half of 2027.',
    },
    channels: [
      { ko: '성균관대학교 공지사항', en: 'The SKKU notice board' },
      { ko: 'RISE CREW 공식 웹사이트', en: 'The RISE CREW website' },
      { ko: '인스타그램 @skku_anchor', en: 'Instagram @skku_anchor' },
    ],
    closing: { ko: '많은 관심 부탁드립니다!', en: 'We hope to see you there!' },
  },
};

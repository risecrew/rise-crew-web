import type { Officer } from '@/content/schema';

const role = (id: string, ko: string, en: string): Officer => ({
  id,
  role: { ko, en },
  consent: false,
});

export const officers: Officer[] = [
  role('advisor', '고문', 'Advisor'),
  role('president', '회장', 'President'),
  role('vice-president-1', '부회장', 'Vice president'),
  role('vice-president-2', '부회장', 'Vice president'),
  role('vice-president-3', '부회장', 'Vice president'),
  role('external-relations', '대외협력', 'External relations'),
  role('marketing', '홍보', 'Marketing'),
  role('design', '디자인', 'Design'),
  role('dev-support', '개발지원', 'Development support'),
  role('secretary', '서기', 'Secretary'),
  role('treasurer', '총무', 'Treasurer'),
];

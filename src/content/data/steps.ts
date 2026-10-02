import type { GrowthStep } from '@/content/schema';

export const steps: GrowthStep[] = [
  {
    id: 'idea',
    order: 1,
    name: { ko: 'Idea & Team Build', en: 'Idea & Team Build' },
    summary: {
      ko: '아이디어를 사업 아이템으로 구체화하고 실행할 창업팀을 꾸립니다.',
      en: 'Shape the idea into a business and form a team that can execute it.',
    },
  },
  {
    id: 'build',
    order: 2,
    name: { ko: 'Build', en: 'Build' },
    summary: {
      ko: '아이디어를 실제로 작동하는 프로토타입(MVP)으로 만듭니다.',
      en: 'Turn the idea into a working prototype (MVP).',
    },
  },
  {
    id: 'validate',
    order: 3,
    name: { ko: 'Validate', en: 'Validate' },
    summary: {
      ko: '실제 고객에게 테스트하고 시장 반응을 데이터로 확인합니다(PMF).',
      en: 'Test with real customers and confirm market response with data (PMF).',
    },
  },
  {
    id: 'pitch',
    order: 4,
    name: { ko: 'Pitch & Funding', en: 'Pitch & Funding' },
    summary: {
      ko: '검증 결과로 투자자를 설득하고 자금을 확보합니다.',
      en: 'Use validation results to persuade investors and raise funding.',
    },
  },
  {
    id: 'global',
    order: 5,
    name: { ko: 'Global', en: 'Global' },
    summary: {
      ko: '국내에서 검증한 모델과 투자금으로 해외 시장에 진출합니다.',
      en: 'Expand overseas with a model and funding proven at home.',
    },
  },
];

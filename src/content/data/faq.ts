import type { Faq } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

export const faqs: Faq[] = [
  {
    id: 'founders-only',
    question: L('창업자만 지원받나요?', 'Is RISE CREW only for founders?'),
    answer: L(
      '아니요. 1:1 커리어 컨설팅과 인턴·취업·진학 상담도 함께 제공합니다.',
      'No. We also offer 1:1 career consulting and advice on internships, jobs and graduate school.',
    ),
  },
  {
    id: 'other-schools',
    question: L(
      '타교생이나 졸업생도 가입할 수 있나요?',
      'Can students from other universities or graduates join?',
    ),
    answer: L(
      '네. 다만 개인 혜택은 수료자에게만 제공됩니다.',
      'Yes. Individual benefits are limited to members who complete the program.',
    ),
  },
  {
    id: 'suwon-campus',
    question: L(
      '자연과학캠퍼스(수원) 학생도 참여할 수 있나요?',
      'Can students at the Natural Sciences Campus (Suwon) join?',
    ),
    answer: L(
      '네. 글로벌 프로그램은 항공료 지원 조건이 다를 수 있습니다.',
      'Yes. Airfare support for global programs may differ.',
    ),
  },
  {
    id: 'new-teammates',
    question: L(
      '활동 중에 팀원이 추가되면 함께 가입할 수 있나요?',
      'Can new teammates join partway through?',
    ),
    answer: L(
      '네. 창업팀은 수시로도 모집합니다.',
      'Yes. We also accept startup teams on a rolling basis.',
    ),
  },
  {
    id: 'external-programs',
    question: L(
      '외부 액셀러레이터 프로그램에 중복 참여해도 되나요?',
      'Can we join outside accelerator programs at the same time?',
    ),
    answer: L('네, 권장합니다.', 'Yes, we encourage it.'),
  },
  {
    id: 'mentoring',
    question: L('상시 멘토링을 받을 수 있나요?', 'Can we get mentoring at any time?'),
    answer: L(
      '호암관 3층의 교수 멘토에게 상시 멘토링을 받을 수 있습니다.',
      'Yes. Faculty mentors on the 3rd floor of Hoam Hall offer mentoring throughout the year.',
    ),
  },
];

import type { Faq } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

// As the organizers answered them (2026-11): teams from the Humanities and Social Sciences Campus.
export const faqs: Faq[] = [
  {
    id: 'teams-only',
    question: L('팀 단위로만 지원이 가능한가요?', 'Can only teams apply?'),
    answer: L(
      '네, 원칙적으로 팀 단위 지원을 받고 있습니다. 다만, 우수한 역량과 성장 가능성을 갖춘 1인 창업가의 경우에도 예외적으로 지원 및 선발이 가능합니다.',
      'Yes, as a rule we take applications from teams. Solo founders with strong skills and growth potential may be accepted as an exception.',
    ),
  },
  {
    id: 'other-schools',
    question: L(
      '타교생이나 졸업생도 가입할 수 있나요?',
      'Can students from other universities or graduates join?',
    ),
    answer: L(
      '아니요. 성균관대학교 인문사회과학캠퍼스 소속 학부생과 대학원생만 가입할 수 있습니다.',
      'No. Only undergraduate and graduate students at the SKKU Humanities and Social Sciences Campus can join.',
    ),
  },
  {
    id: 'suwon-campus',
    question: L(
      '자연과학캠퍼스(수원) 학생도 참여할 수 있나요?',
      'Can students at the Natural Sciences Campus (Suwon) join?',
    ),
    answer: L(
      '인문사회과학캠퍼스 학생이 2명 이상이고 팀 대표도 인문사회과학캠퍼스 학생인 팀의 팀원이라면 참여할 수 있습니다.',
      'Yes, as a member of a team with at least two Humanities and Social Sciences Campus students, including the team lead.',
    ),
  },
  {
    id: 'new-teammates',
    question: L(
      '활동 중에 팀원이 추가되면 함께 가입할 수 있나요?',
      'Can new teammates join partway through?',
    ),
    answer: L(
      '네. 이미 가입한 팀은 팀원을 추가로 영입할 수 있습니다. 새 창업팀은 수시로 모집하지 않습니다.',
      'Yes. Teams already in RISE CREW can bring in new members. We do not take new teams between intakes.',
    ),
  },
  {
    id: 'external-programs',
    question: L(
      '외부 액셀러레이터 프로그램에 중복 참여해도 되나요?',
      'Can we join outside accelerator programs at the same time?',
    ),
    answer: L('네, 가능합니다.', 'Yes, you can.'),
  },
  {
    id: 'mentoring',
    question: L('상시 멘토링을 받을 수 있나요?', 'Can we get mentoring at any time?'),
    answer: L(
      '창업팀을 대상으로 1:1 멘토링을 운영합니다. 매 학기 초 원하는 멘토에게 멘토링을 신청한 뒤, 자유롭게 시간을 조율해 만나면 됩니다.',
      'We run 1:1 mentoring for startup teams. At the start of each semester, ask for the mentor you want, then arrange times to meet as you like.',
    ),
  },
];

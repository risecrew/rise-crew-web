import type { Benefit } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

export const benefits: Benefit[] = [
  {
    id: 'team-building',
    title: L('아이디어 발굴과 팀 빌딩', 'Ideas and team building'),
    body: L(
      '다양한 전공의 팀원과 스타트업 팀을 꾸립니다.',
      'Form a startup team with members from different majors.',
    ),
  },
  {
    id: 'mentoring',
    title: L('전문 멘토링과 정기 세미나', 'Expert mentoring and seminars'),
    body: L(
      '업계 전문가와 선배 창업가의 멘토링, 최신 트렌드 세미나를 제공합니다.',
      'Mentoring from industry experts and alumni founders, plus regular trend seminars.',
    ),
  },
  {
    id: 'programs',
    title: L(
      'ANCHOR 사업단 국내외 프로그램 우선 참여',
      'Priority access to ANCHOR Division programs',
    ),
    body: L(
      '사업단이 주관하는 국내외 프로그램에 우선 참여할 수 있습니다.',
      'Get priority access to domestic and global programs run by the ANCHOR Division.',
    ),
  },
  {
    id: 'ir',
    title: L('사업계획서와 IR 피칭 지원', 'Business plans and IR pitching'),
    body: L(
      '사업계획서 작성 교육과 투자자 대상 IR 피칭 훈련을 받습니다.',
      'Training in writing business plans and pitching to investors.',
    ),
  },
  {
    id: 'competitions',
    title: L('국내외 창업경진대회 참가 지원', 'Startup competitions'),
    body: L('준비 과정부터 출전 비용까지 지원합니다.', 'Support from preparation to entry costs.'),
  },
  {
    id: 'internships',
    title: L('스타트업 인턴십', 'Startup internships'),
    body: L(
      '유망 스타트업에서 인턴으로 일하며 현장 경험과 네트워크를 쌓습니다.',
      'Intern at promising startups to gain field experience and a network.',
    ),
  },
  {
    id: 'government',
    title: L('정부지원사업 공모 지원', 'Government program applications'),
    body: L(
      '예비창업패키지 등 정부지원사업 서류 준비와 전략을 전문가와 함께합니다.',
      'Prepare applications and strategy for programs such as the Pre-Startup Package with experts.',
    ),
  },
];

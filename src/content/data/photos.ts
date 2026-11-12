import type { Photo } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
const archive = (ko: string, en: string) =>
  L(`RISE CREW 활동 사진 (${ko})`, `RISE CREW photo archive (${en})`);

// The club's own activity photos, resized for the web with their metadata (including location)
// removed. The originals stay outside the repository.
export const photos: Photo[] = [
  {
    id: 'seminar-2025-11',
    src: '/images/activities/seminar-2025-11.jpg',
    width: 2000,
    height: 1500,
    alt: L(
      '강의실에서 제품 가설검증과 프로젝트 관리 강연을 듣는 RISE CREW 2025 세미나',
      'RISE CREW at the 2025 seminar, listening to a talk on testing product ideas and running projects',
    ),
    source: archive('2025.11.19', 'Nov 19, 2025'),
    temporary: false,
  },
  {
    id: 'workshop-2026-01',
    src: '/images/activities/workshop-2026-01.jpg',
    width: 2400,
    height: 1600,
    alt: L(
      '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍 단체 사진',
      'Group photo at the Kakao Mobility × RISE CREW roundtable mentoring workshop',
    ),
    source: archive('2026.1.24', 'Jan 24, 2026'),
    temporary: false,
  },
  {
    id: 'sushi-tech-tokyo-2026',
    src: '/images/activities/sushi-tech-tokyo-2026.jpg',
    width: 1440,
    height: 1080,
    alt: L(
      'SusHi Tech Tokyo 2026 간판 앞 RISE CREW 단체 사진',
      'RISE CREW in front of the SusHi Tech Tokyo 2026 sign',
    ),
    source: archive('2026.4', 'Apr 2026'),
    temporary: false,
  },
  {
    id: 'beyond-expo-macau-2026',
    src: '/images/activities/beyond-expo-macau-2026.jpg',
    width: 2400,
    height: 1800,
    alt: L(
      '마카오 성 바울 성당 유적 앞에서 BEYOND Expo 2026 현수막을 든 RISE CREW',
      'RISE CREW holding a BEYOND Expo 2026 banner at the Ruins of St. Paul’s, Macau',
    ),
    source: archive('2026.5.27', 'May 27, 2026'),
    temporary: false,
  },
  {
    id: 'techfest-vietnam',
    src: '/images/activities/vietnam-2025-12.jpg',
    width: 2400,
    height: 1800,
    alt: L(
      '베트남 국가혁신센터(NIC) 앞 RISE CREW 단체 사진',
      'RISE CREW at the National Innovation Center (NIC), Vietnam',
    ),
    source: archive('2025.12.11', 'Dec 11, 2025'),
    temporary: false,
  },
  {
    id: 'smu-vibe-coding-2025-12',
    src: '/images/activities/smu-vibe-coding-2025-12.jpg',
    width: 1920,
    height: 1440,
    alt: L(
      '싱가포르 마리나베이를 배경으로 SMU × SKKU AI 바이브코딩 스프린트 현수막을 든 단체 사진',
      'Group photo with the SMU × SKKU AI Vibe Coding Sprint banner, Marina Bay behind',
    ),
    source: archive('2025.12', 'Dec 2025'),
    temporary: false,
  },
  {
    id: 'roundtable-2026-08',
    src: '/images/activities/roundtable-2026-08.jpg',
    width: 2400,
    height: 1600,
    alt: L(
      '제2회 SKKU 창업팀 라운드테이블 워크숍 수상팀과 참가자 단체 사진',
      'Award winners and participants at the 2nd SKKU startup team roundtable workshop',
    ),
    source: archive('2026.8.29', 'Aug 29, 2026'),
    temporary: false,
  },
  {
    id: 'beyond-expo-crew-jersey-2026',
    src: '/images/activities/beyond-expo-crew-jersey-2026.jpg',
    width: 3200,
    height: 2400,
    alt: L(
      'BEYOND Expo 2026 전시장에서 RISE CREW 25 저지를 펼쳐 든 RISE CREW 멤버들',
      'RISE CREW members holding up a RISE CREW 25 jersey on the BEYOND Expo 2026 floor',
    ),
    source: archive('2026.5 마카오', 'Macau, May 2026'),
    temporary: false,
    event: 'beyond-expo',
  },
  {
    id: 'roundtable-2026-08-group',
    src: '/images/activities/roundtable-2026-08-group.jpg',
    width: 3200,
    height: 2133,
    alt: L(
      'RISE CREW 바람막이를 입고 무대 앞에서 주먹을 들어 올린 제2회 SKKU 창업팀 라운드테이블 워크숍 참가자와 멘토들',
      'Participants and mentors in RISE CREW jackets raising their fists in front of the stage at the 2nd SKKU startup team roundtable workshop',
    ),
    source: archive('2026.8.28~29', 'Aug 28–29, 2026'),
    temporary: false,
    event: 'roundtable-2',
  },
];

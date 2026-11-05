import type { Photo } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });
const archive = (ko: string, en: string) =>
  L(`RISE CREW 활동 사진 (${ko})`, `RISE CREW photo archive (${en})`);

// The club's own activity photos, resized for the web with their metadata (including location)
// removed. The originals stay outside the repository.
export const photos: Photo[] = [
  {
    id: 'workshop-2026-01',
    src: '/images/activities/workshop-2026-01.jpg',
    width: 2400,
    height: 1600,
    alt: L(
      '카카오모빌리티 × RISE CREW 창업아이템 라운드테이블 멘토링 워크숍 단체 사진',
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
      'Sushi Tech Tokyo 2026 간판 앞 RISE CREW 단체 사진',
      'RISE CREW in front of the Sushi Tech Tokyo 2026 sign',
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
      '2회 SKKU 창업팀 라운드테이블 워크숍 수상팀과 참가자 단체 사진',
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
  },
];

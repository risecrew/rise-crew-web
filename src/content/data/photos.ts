import type { Photo } from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

// Temporary photos taken from the club's own brochure (RISE CREW 소개서, 2026.10) until the
// originals arrive. Press photos (e.g. credited to 전자신문) and mentor headshots are not used.
export const photos: Photo[] = [
  {
    id: 'workshop-2026-01',
    src: '/images/temp/workshop-2026-01.jpg',
    width: 1229,
    height: 819,
    alt: L(
      '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍 단체 사진',
      'Group photo at the Kakao Mobility × RISE CREW roundtable mentoring workshop',
    ),
    source: L('RISE CREW 소개서 9쪽', 'RISE CREW brochure, p.9'),
    temporary: true,
  },
  {
    id: 'sushi-tech-tokyo-2026',
    src: '/images/temp/sushi-tech-tokyo-2026.jpg',
    width: 1008,
    height: 756,
    alt: L(
      'Sushi Tech Tokyo 2026 행사장의 RISE CREW 단체 사진',
      'RISE CREW at Sushi Tech Tokyo 2026',
    ),
    source: L('RISE CREW 소개서 11쪽', 'RISE CREW brochure, p.11'),
    temporary: true,
  },
  {
    id: 'beyond-expo-macau-2026',
    src: '/images/temp/beyond-expo-macau-2026.jpg',
    width: 1200,
    height: 900,
    alt: L('마카오 BEYOND Expo 2026 조형물 앞 단체 사진', 'RISE CREW at BEYOND Expo 2026 in Macau'),
    source: L('RISE CREW 소개서 12쪽', 'RISE CREW brochure, p.12'),
    temporary: true,
  },
  {
    id: 'techfest-vietnam',
    src: '/images/temp/techfest-vietnam.jpg',
    width: 1024,
    height: 768,
    alt: L('베트남 TECHFEST 전시 부스', 'Exhibition booth at TECHFEST Vietnam'),
    source: L('RISE CREW 소개서 7쪽', 'RISE CREW brochure, p.7'),
    temporary: true,
  },
  {
    id: 'smu-vibe-coding-2025-12',
    src: '/images/temp/smu-vibe-coding-2025-12.jpg',
    width: 1152,
    height: 864,
    alt: L(
      '싱가포르에서 열린 SMU × SKKU AI 바이브코딩 스프린트 단체 사진',
      'Group photo at the SMU × SKKU AI Vibe Coding Sprint in Singapore',
    ),
    source: L('RISE CREW 소개서 8쪽', 'RISE CREW brochure, p.8'),
    temporary: true,
  },
];

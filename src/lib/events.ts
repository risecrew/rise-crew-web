import type { Photo, Stamp } from '@/content/schema';
import { stampState } from '@/lib/content';

// The activity a photo belongs to: the one that names it as its photo, or the one the photo names.
export function eventOf(photo: Photo, stamps: Stamp[]): Stamp | undefined {
  return stamps.find((s) => s.photo === photo.id) ?? stamps.find((s) => s.id === photo.event);
}

// Finished activities that have a photo, newest first.
export function recentEvents(stamps: Stamp[], photos: Photo[]): { stamp: Stamp; photo: Photo }[] {
  return stamps
    .filter((s) => s.status === 'done' && s.date && s.photo)
    .flatMap((s) => {
      const photo = photos.find((p) => p.id === s.photo);
      return photo ? [{ stamp: s, photo }] : [];
    })
    .sort((a, b) => b.stamp.date!.localeCompare(a.stamp.date!));
}

// What is coming up, soonest first. A planned date that has passed without a record is left out.
export function upcomingEvents(stamps: Stamp[], today: Date): Stamp[] {
  return stamps
    .filter((s) => stampState(s, today) === 'upcoming')
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}

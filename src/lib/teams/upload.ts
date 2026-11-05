import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { PHOTO_TYPES, TEAM_LIMITS, checkPhoto } from './forms';

export type UploadError = 'tooLarge' | 'badType' | 'failed';

function extensionOf(file: File): string {
  return PHOTO_TYPES[file.type as keyof typeof PHOTO_TYPES];
}

// Photos go straight from the browser to Storage as the signed-in person: they do not fit through a
// server action. Storage checks the size, the type and who is asking again, so this check is only
// here to give a person a sentence instead of a refusal.
//
// All or nothing: when one file fails, the ones already up are taken down again.
export async function uploadPhotos(
  teamId: string,
  postId: string,
  files: File[],
): Promise<{ paths: string[] } | { error: UploadError }> {
  for (const file of files) {
    const check = checkPhoto(file, TEAM_LIMITS.photoBytes);
    if (check !== 'ok') return { error: check };
  }

  const bucket = createSupabaseBrowserClient().storage.from('team-post-photos');
  const paths: string[] = [];
  for (const file of files) {
    const path = `${teamId}/${postId}/${crypto.randomUUID()}.${extensionOf(file)}`;
    let failed = false;
    try {
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      failed = error !== null;
    } catch {
      failed = true;
    }
    if (failed) {
      await removePhotos(paths);
      return { error: 'failed' };
    }
    paths.push(path);
  }
  return { paths };
}

export async function removePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await createSupabaseBrowserClient().storage.from('team-post-photos').remove(paths);
  } catch {
    // Taking files back down is a courtesy; a leftover file has no post and nobody outside the team
    // can open it.
  }
}

type TeamImageBucket = 'team-logos' | 'team-covers';

const IMAGE_LIMITS: Record<TeamImageBucket, number> = {
  'team-logos': TEAM_LIMITS.logoBytes,
  'team-covers': TEAM_LIMITS.coverBytes,
};

// A team's logo or cover: one public file in the team's folder.
export async function uploadTeamImage(
  bucket: TeamImageBucket,
  teamId: string,
  file: File,
): Promise<{ path: string } | { error: UploadError }> {
  const check = checkPhoto(file, IMAGE_LIMITS[bucket]);
  if (check !== 'ok') return { error: check };

  const path = `${teamId}/${crypto.randomUUID()}.${extensionOf(file)}`;
  try {
    const { error } = await createSupabaseBrowserClient()
      .storage.from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });
    return error ? { error: 'failed' } : { path };
  } catch {
    return { error: 'failed' };
  }
}

export async function removeTeamImage(bucket: TeamImageBucket, path: string): Promise<void> {
  try {
    await createSupabaseBrowserClient().storage.from(bucket).remove([path]);
  } catch {
    // As above: a leftover image is harmless.
  }
}

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { PHOTO_TYPES, TEAM_LIMITS, checkPhoto } from './forms';
import { shrinkImage, type ImageKind } from './shrink';

export type UploadError = 'tooLarge' | 'badType' | 'unreadable' | 'denied' | 'failed';

// Storage says no with a 403 when the policies refuse: the person is no longer allowed, which is
// not the same as a failed upload that trying again would fix.
export function uploadFailure(error: unknown): 'denied' | 'failed' {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  return status === 403 || statusCode === '403' ? 'denied' : 'failed';
}

export function photoExtension(blob: Blob): string {
  return PHOTO_TYPES[blob.type as keyof typeof PHOTO_TYPES];
}

// Checks and shrinks one picture. Nothing has gone up yet at this point.
export async function prepareImage(
  file: File,
  kind: ImageKind,
): Promise<{ blob: Blob } | { error: UploadError }> {
  const check = checkPhoto(file, TEAM_LIMITS.inputBytes);
  if (check !== 'ok') return { error: check };
  return shrinkImage(file, kind);
}

// Photos go straight from the browser to Storage as the signed-in person: they do not fit through a
// server action. Storage checks the size, the type and who is asking again, so the checks here are
// only to give a person a sentence instead of a refusal.
//
// All or nothing: when one file fails, the ones already up are taken down again.
export async function uploadPhotos(
  teamId: string,
  postId: string,
  files: File[],
): Promise<{ paths: string[] } | { error: UploadError }> {
  const blobs: Blob[] = [];
  for (const file of files) {
    const prepared = await prepareImage(file, 'photo');
    if ('error' in prepared) return prepared;
    blobs.push(prepared.blob);
  }

  const bucket = createSupabaseBrowserClient().storage.from('team-post-photos');
  const paths: string[] = [];
  for (const blob of blobs) {
    const path = `${teamId}/${postId}/${crypto.randomUUID()}.${photoExtension(blob)}`;
    let failure: 'denied' | 'failed' | null = null;
    try {
      const { error } = await bucket.upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) failure = uploadFailure(error);
    } catch {
      failure = 'failed';
    }
    if (failure) {
      await removePhotos(paths);
      return { error: failure };
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

// A team's logo or cover: one public file in the team's folder.
export async function uploadTeamImage(
  bucket: TeamImageBucket,
  teamId: string,
  file: File,
): Promise<{ path: string } | { error: UploadError }> {
  const prepared = await prepareImage(file, bucket === 'team-logos' ? 'logo' : 'cover');
  if ('error' in prepared) return prepared;

  const path = `${teamId}/${crypto.randomUUID()}.${photoExtension(prepared.blob)}`;
  try {
    const { error } = await createSupabaseBrowserClient()
      .storage.from(bucket)
      .upload(path, prepared.blob, { contentType: prepared.blob.type, upsert: false });
    return error ? { error: uploadFailure(error) } : { path };
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

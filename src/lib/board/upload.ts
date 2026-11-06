import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { prepareImage, uploadFailure, type UploadError, photoExtension } from '@/lib/teams/upload';

// One activity photo, straight from the browser to Storage as the signed-in operator: it does not fit
// through a server action. Storage checks the size, the type and who is asking again.
export async function uploadActivityPhoto(
  file: File,
): Promise<{ path: string } | { error: UploadError }> {
  const prepared = await prepareImage(file, 'photo');
  if ('error' in prepared) return prepared;

  const path = `${crypto.randomUUID()}.${photoExtension(prepared.blob)}`;
  try {
    const { error } = await createSupabaseBrowserClient()
      .storage.from('activity-photos')
      .upload(path, prepared.blob, { contentType: prepared.blob.type, upsert: false });
    return error ? { error: uploadFailure(error) } : { path };
  } catch {
    return { error: 'failed' };
  }
}

export async function removeActivityPhoto(path: string): Promise<void> {
  try {
    await createSupabaseBrowserClient().storage.from('activity-photos').remove([path]);
  } catch {
    // Taking a file back down is a courtesy: a leftover file is on no page.
  }
}

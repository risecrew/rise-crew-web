import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cleanFileName, noticeFileContentType, noticeFileEnding, type Attachment } from './forms';
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

type NoticeUpload = { photos: string[]; files: Attachment[] };

// Everything a notice is about to carry. All or nothing: when one fails, the ones already up come
// down again, so a person who tries again does not leave copies behind.
export async function uploadNoticeFiles(
  photos: File[],
  files: File[],
): Promise<NoticeUpload | { error: UploadError }> {
  const blobs: Blob[] = [];
  for (const photo of photos) {
    const prepared = await prepareImage(photo, 'photo');
    if ('error' in prepared) return prepared;
    blobs.push(prepared.blob);
  }

  const bucket = createSupabaseBrowserClient().storage.from('notice-files');
  const done: string[] = [];
  const put = async (
    path: string,
    body: Blob,
    contentType: string,
  ): Promise<UploadError | null> => {
    try {
      const { error } = await bucket.upload(path, body, { contentType, upsert: false });
      if (error) return uploadFailure(error);
      done.push(path);
      return null;
    } catch {
      return 'failed';
    }
  };
  const fail = async (error: UploadError) => {
    await removeNoticeFiles(done);
    return { error };
  };

  const result: NoticeUpload = { photos: [], files: [] };
  for (const blob of blobs) {
    const path = `${crypto.randomUUID()}.${photoExtension(blob)}`;
    const error = await put(path, blob, blob.type);
    if (error) return fail(error);
    result.photos.push(path);
  }
  for (const file of files) {
    const ending = noticeFileEnding(file.name);
    const contentType = noticeFileContentType(file.name);
    if (!ending || !contentType) return fail('badType');
    const path = `${crypto.randomUUID()}.${ending}`;
    // Storage goes by the type on the file itself, and browsers often leave a Hangul file without one.
    const error = await put(path, new Blob([file], { type: contentType }), contentType);
    if (error) return fail(error);
    result.files.push({ path, name: cleanFileName(file.name), size: file.size });
  }
  return result;
}

export async function removeNoticeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await createSupabaseBrowserClient().storage.from('notice-files').remove(paths);
  } catch {
    // As above: a leftover file is on no page.
  }
}

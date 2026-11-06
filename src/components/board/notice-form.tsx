'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createNotice, updateNotice } from '@/app/[locale]/admin/notices/actions';
import { FieldNotice } from '@/components/teams/field-notice';
import { LABEL, MESSAGE, OUTLINE, PRIMARY, ROW, TEXT_BUTTON } from '@/components/teams/form-parts';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import {
  BOARD_LIMITS,
  NOTICE_FILE_ACCEPT,
  noticeFileProblem,
  type Attachment,
  type BoardState,
} from '@/lib/board/forms';
import { formatFileSize, noticePhotoSrc } from '@/lib/board/text';
import { removeNoticeFiles, uploadNoticeFiles } from '@/lib/board/upload';
import { TEAM_LIMITS, checkPhoto } from '@/lib/teams/forms';
import { BoardField } from './fields';

type Notice = {
  id: string;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  is_pinned: boolean;
  photo_paths: string[];
  attachments: Attachment[];
};

const FILE_BUTTON =
  'mt-3 block w-full text-base text-white/85 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-4 file:py-2 file:font-semibold file:text-white';
const ATTACHED = 'flex min-h-11 flex-wrap items-center justify-between gap-x-3 py-1 text-base';

// To write a notice, or change one. Photos and files go up first, straight to Storage, and the row
// names them afterwards. React empties a form once its action has run, so everything is kept here and
// a refusal leaves what was typed and picked in place.
export function NoticeForm({ notice }: { notice?: Notice }) {
  const t = useTranslations('Admin.notices');
  const board = useTranslations('Admin.board');
  const locale = useCurrentLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    title_ko: notice?.title_ko ?? '',
    title_en: notice?.title_en ?? '',
    body_ko: notice?.body_ko ?? '',
    body_en: notice?.body_en ?? '',
  });
  const [pinned, setPinned] = useState(notice?.is_pinned ?? false);
  const [keptPhotos, setKeptPhotos] = useState(notice?.photo_paths ?? []);
  const [keptFiles, setKeptFiles] = useState(notice?.attachments ?? []);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const [state, action, pending] = useActionState<BoardState, FormData>(async (previous, form) => {
    const save = notice ? updateNotice : createNotice;
    setProblem(null);
    const uploaded = await uploadNoticeFiles(newPhotos, newFiles);
    if ('error' in uploaded) {
      setProblem(board(`upload.${uploaded.error}`));
      return null;
    }
    form.set('photo_paths', JSON.stringify([...keptPhotos, ...uploaded.photos]));
    form.set('attachments', JSON.stringify([...keptFiles, ...uploaded.files]));
    const result = await save(previous, form);
    // Saved, it redirects and never reaches this line. Refused, nothing points at the new files.
    await removeNoticeFiles([...uploaded.photos, ...uploaded.files.map((file) => file.path)]);
    return result;
  }, null);
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function onPhotos(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = '';
    setProblem(null);
    const refused = picked
      .map((file) => checkPhoto(file, TEAM_LIMITS.inputBytes))
      .find((c) => c !== 'ok');
    if (refused) {
      setProblem(board(`upload.${refused}`));
      return;
    }
    if (keptPhotos.length + newPhotos.length + picked.length > BOARD_LIMITS.noticePhotos) {
      setProblem(t('tooManyPhotos', { count: BOARD_LIMITS.noticePhotos }));
      return;
    }
    setNewPhotos((current) => [...current, ...picked]);
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = '';
    setProblem(null);
    for (const file of picked) {
      const refused = noticeFileProblem(file);
      if (refused) {
        setProblem(t(refused === 'tooLarge' ? 'fileTooLarge' : 'fileBadType', { name: file.name }));
        return;
      }
    }
    if (keptFiles.length + newFiles.length + picked.length > BOARD_LIMITS.noticeFiles) {
      setProblem(t('tooManyFiles', { count: BOARD_LIMITS.noticeFiles }));
      return;
    }
    setNewFiles((current) => [...current, ...picked]);
  }

  function field(name: keyof typeof values, label: string, maxLength: number, rows?: number) {
    return (
      <div className={ROW}>
        <BoardField
          name={name}
          label={label}
          value={values[name]}
          onChange={(value) => setValues((current) => ({ ...current, [name]: value }))}
          maxLength={rows ? undefined : maxLength}
          rows={rows}
          error={fields[name]}
        />
      </div>
    );
  }

  function attached(key: string, name: string, size: number, onRemove: () => void) {
    return (
      <li key={key} className={ATTACHED}>
        <span className="min-w-0 wrap-anywhere">
          {name} <span className="font-mono text-sm text-white/60">{formatFileSize(size)}</span>
        </span>
        <button
          type="button"
          aria-label={t('removeLabel', { name })}
          className={TEXT_BUTTON}
          onClick={onRemove}
        >
          {t('remove')}
        </button>
      </li>
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {notice ? <input type="hidden" name="id" value={notice.id} /> : null}
      {field('title_ko', t('titleKo'), BOARD_LIMITS.noticeTitle)}
      {field('body_ko', t('bodyKo'), BOARD_LIMITS.noticeBody, 10)}

      <div className={ROW}>
        <p className="text-sm break-keep text-white">{t('publicWarning')}</p>

        <label htmlFor="notice-photos" className={`${LABEL} mt-5`}>
          {t('photos', { count: BOARD_LIMITS.noticePhotos })}
        </label>
        {keptPhotos.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-3">
            {keptPhotos.map((path, index) => (
              <li key={path} className="flex items-center gap-1">
                <Image
                  src={noticePhotoSrc(path)}
                  alt={t('photoAlt', { number: index + 1 })}
                  width={120}
                  height={80}
                  unoptimized
                  className="aspect-[3/2] w-24 rounded-lg object-cover"
                />
                <button
                  type="button"
                  aria-label={t('removePhoto', { number: index + 1 })}
                  className={TEXT_BUTTON}
                  onClick={() => setKeptPhotos((current) => current.filter((p) => p !== path))}
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {newPhotos.length > 0 ? (
          <ul className="mt-3">
            {newPhotos.map((file, index) =>
              attached(`${file.name}-${index}`, file.name, file.size, () =>
                setNewPhotos((current) => current.filter((_, i) => i !== index)),
              ),
            )}
          </ul>
        ) : null}
        <input
          id="notice-photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onPhotos}
          className={FILE_BUTTON}
        />

        <label htmlFor="notice-files" className={`${LABEL} mt-6`}>
          {t('files', { count: BOARD_LIMITS.noticeFiles })}
        </label>
        {keptFiles.length + newFiles.length > 0 ? (
          <ul className="mt-3">
            {keptFiles.map((file) =>
              attached(file.path, file.name, file.size, () =>
                setKeptFiles((current) => current.filter((f) => f.path !== file.path)),
              ),
            )}
            {newFiles.map((file, index) =>
              attached(`${file.name}-${index}`, file.name, file.size, () =>
                setNewFiles((current) => current.filter((_, i) => i !== index)),
              ),
            )}
          </ul>
        ) : null}
        <input
          id="notice-files"
          type="file"
          multiple
          accept={NOTICE_FILE_ACCEPT}
          aria-describedby="notice-files-hint"
          onChange={onFiles}
          className={FILE_BUTTON}
        />
        <p id="notice-files-hint" className="mt-2 px-2 text-sm break-keep text-white/65">
          {t('filesHint')}
        </p>
        <FieldNotice text={problem} />
      </div>

      {field('title_en', t('titleEn'), BOARD_LIMITS.noticeTitle)}
      {field('body_en', t('bodyEn'), BOARD_LIMITS.noticeBody, 10)}
      <div className={ROW}>
        <label className="flex min-h-11 items-center gap-3 text-base text-white/85">
          <input
            type="checkbox"
            name="is_pinned"
            checked={pinned}
            onChange={(event) => setPinned(event.target.checked)}
            className="size-5 accent-lime"
          />
          {t('pinned')}
        </label>
      </div>
      <div role="alert">
        {state && !state.ok ? <p className={MESSAGE}>{board(`errors.${state.error}`)}</p> : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY}>
          {pending ? board('saving') : board('save')}
        </button>
        <a href={`/${locale}/admin/notices`} className={OUTLINE}>
          {board('cancel')}
        </a>
      </div>
    </form>
  );
}

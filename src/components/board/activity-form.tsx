'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createActivity, updateActivity } from '@/app/[locale]/admin/activities/actions';
import { FieldNotice } from '@/components/teams/field-notice';
import { LABEL, MESSAGE, OUTLINE, PRIMARY, ROW, TEXT_BUTTON } from '@/components/teams/form-parts';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { BOARD_LIMITS, type BoardState } from '@/lib/board/forms';
import { activityPhotoSrc } from '@/lib/board/text';
import { removeActivityPhoto, uploadActivityPhoto } from '@/lib/board/upload';
import { TEAM_LIMITS, checkPhoto } from '@/lib/teams/forms';
import type { UploadError } from '@/lib/teams/upload';
import { BoardField, BoardPair } from './fields';

type Activity = {
  id: string;
  date: string | null;
  end_date: string | null;
  title_ko: string;
  title_en: string;
  city_ko: string;
  city_en: string;
  summary_ko: string;
  summary_en: string;
  body_ko: string;
  body_en: string;
  results_ko: string;
  results_en: string;
  photo: string | null;
  gallery: string[];
  is_planned: boolean;
};

// To add an activity, or change one. The photo goes up first, straight to Storage, and the row names
// it afterwards. React empties a form once its action has run, so the values are kept here and a
// refusal leaves what was typed in place.
export function ActivityForm({ activity }: { activity?: Activity }) {
  const t = useTranslations('Admin.activities');
  const board = useTranslations('Admin.board');
  const locale = useCurrentLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState({
    date: activity?.date ?? '',
    end_date: activity?.end_date ?? '',
    title_ko: activity?.title_ko ?? '',
    title_en: activity?.title_en ?? '',
    city_ko: activity?.city_ko ?? '',
    city_en: activity?.city_en ?? '',
    summary_ko: activity?.summary_ko ?? '',
    summary_en: activity?.summary_en ?? '',
    body_ko: activity?.body_ko ?? '',
    body_en: activity?.body_en ?? '',
    results_ko: activity?.results_ko ?? '',
    results_en: activity?.results_en ?? '',
  });
  const [planned, setPlanned] = useState(activity?.is_planned ?? false);
  const [photo, setPhoto] = useState(activity?.photo ?? null);
  const [photoProblem, setPhotoProblem] = useState<UploadError | null>(null);
  // The gallery: files already up (kept in their order), then the ones picked to go up on save.
  const [gallery, setGallery] = useState<string[]>(activity?.gallery ?? []);
  const [picked, setPicked] = useState<File[]>([]);
  const [galleryProblem, setGalleryProblem] = useState<string | null>(null);

  const [state, action, pending] = useActionState<BoardState, FormData>(async (previous, form) => {
    const save = activity ? updateActivity : createActivity;
    // Everything this press puts up, so a refusal can take it down again.
    const uploads: string[] = [];
    const undo = async () => {
      for (const path of uploads) await removeActivityPhoto(path);
    };

    const file = fileRef.current?.files?.[0];
    if (file) {
      const uploaded = await uploadActivityPhoto(file);
      if ('error' in uploaded) {
        setPhotoProblem(uploaded.error);
        return null;
      }
      uploads.push(uploaded.path);
      form.set('photo', uploaded.path);
    }
    for (const extra of picked) {
      const uploaded = await uploadActivityPhoto(extra);
      if ('error' in uploaded) {
        await undo();
        setGalleryProblem(board(`upload.${uploaded.error}`));
        return null;
      }
      uploads.push(uploaded.path);
      form.append('gallery', uploaded.path);
    }

    const result = await save(previous, form);
    // Saved, it redirects and never reaches this line. Refused, nothing points at the new files.
    await undo();
    return result;
  }, null);
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  // Not the form's `action` prop: React resets a form when its action ends, which would empty a picked
  // file and untick a box after a refusal.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  }

  function field(name: keyof typeof values, label: string, maxLength?: number, rows?: number) {
    return (
      <BoardField
        name={name}
        label={label}
        value={values[name]}
        onChange={(value) => setValues((current) => ({ ...current, [name]: value }))}
        maxLength={maxLength}
        rows={rows}
        error={fields[name]}
        hint={
          name === 'date'
            ? t('dateHint')
            : name === 'end_date'
              ? t('endDateHint')
              : name === 'results_ko' || name === 'results_en'
                ? t('resultsHint')
                : undefined
        }
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}
      <input type="hidden" name="photo" value={photo ?? ''} />

      <BoardPair>
        {field('title_ko', t('titleKo'), BOARD_LIMITS.activityTitle)}
        {field('title_en', t('titleEn'), BOARD_LIMITS.activityTitle)}
      </BoardPair>
      <BoardPair>
        {field('date', t('date'))}
        {field('end_date', t('endDate'))}
      </BoardPair>
      <BoardPair>
        {field('city_ko', t('cityKo'), BOARD_LIMITS.city)}
        {field('city_en', t('cityEn'), BOARD_LIMITS.city)}
      </BoardPair>

      <div className={ROW}>
        <label htmlFor="board-photo" className={LABEL}>
          {t('photo')}
        </label>
        {photo ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Image
              src={activityPhotoSrc(photo)}
              alt={t('currentPhoto')}
              width={240}
              height={160}
              unoptimized
              className="aspect-[3/2] w-40 rounded-2xl object-cover"
            />
            <button
              type="button"
              className={TEXT_BUTTON}
              onClick={() => {
                setPhoto(null);
                // Also a file just picked: "remove the photo" should leave no photo.
                if (fileRef.current) fileRef.current.value = '';
                setPhotoProblem(null);
              }}
            >
              {t('removePhoto')}
            </button>
          </div>
        ) : null}
        <input
          ref={fileRef}
          id="board-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            const check = file ? checkPhoto(file, TEAM_LIMITS.inputBytes) : 'ok';
            setPhotoProblem(check === 'ok' ? null : check);
            if (check !== 'ok') event.target.value = '';
          }}
          className="mt-3 block w-full text-base text-white/85 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <FieldNotice text={photoProblem ? board(`upload.${photoProblem}`) : null} />
      </div>

      <div className={ROW}>
        <label htmlFor="board-gallery" className={LABEL}>
          {t('gallery', { count: BOARD_LIMITS.gallery })}
        </label>
        <p className="mt-1 text-sm break-keep text-white/65">{t('galleryHint')}</p>
        {gallery.map((path) => (
          <input key={path} type="hidden" name="gallery" value={path} />
        ))}
        {gallery.length + picked.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {gallery.map((path, index) => (
              <li key={path} className="flex flex-col gap-1">
                <Image
                  src={activityPhotoSrc(path)}
                  alt={t('galleryPhoto', { number: index + 1 })}
                  width={160}
                  height={107}
                  unoptimized
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  className={TEXT_BUTTON}
                  onClick={() => setGallery((current) => current.filter((p) => p !== path))}
                >
                  {t('galleryRemove', { number: index + 1 })}
                </button>
              </li>
            ))}
            {picked.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex flex-col gap-1"
              >
                <PickedPhoto
                  file={file}
                  alt={t('galleryPhoto', { number: gallery.length + index + 1 })}
                />
                <button
                  type="button"
                  className={TEXT_BUTTON}
                  onClick={() => setPicked((current) => current.filter((_, i) => i !== index))}
                >
                  {t('galleryRemove', { number: gallery.length + index + 1 })}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id="board-gallery"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            const room = BOARD_LIMITS.gallery - gallery.length - picked.length;
            const ok = files.filter((f) => checkPhoto(f, TEAM_LIMITS.inputBytes) === 'ok');
            const bad = files.find((f) => checkPhoto(f, TEAM_LIMITS.inputBytes) !== 'ok');
            setGalleryProblem(
              ok.length > room
                ? t('galleryTooMany', { count: BOARD_LIMITS.gallery })
                : bad
                  ? board(`upload.${checkPhoto(bad, TEAM_LIMITS.inputBytes) as UploadError}`)
                  : null,
            );
            setPicked((current) => [...current, ...ok.slice(0, Math.max(0, room))]);
          }}
          className="mt-3 block w-full text-base text-white/85 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <FieldNotice text={galleryProblem} />
      </div>

      <BoardPair>
        {field('summary_ko', t('summaryKo'), BOARD_LIMITS.summary, 3)}
        {field('summary_en', t('summaryEn'), BOARD_LIMITS.summary, 3)}
      </BoardPair>
      <BoardPair>
        {field('body_ko', t('bodyKo'), BOARD_LIMITS.body, 8)}
        {field('body_en', t('bodyEn'), BOARD_LIMITS.body, 8)}
      </BoardPair>
      <BoardPair>
        {field('results_ko', t('resultsKo'), BOARD_LIMITS.results, 3)}
        {field('results_en', t('resultsEn'), BOARD_LIMITS.results, 3)}
      </BoardPair>

      <div className={ROW}>
        <label className="flex min-h-11 items-center gap-3 text-base text-white/85">
          <input
            type="checkbox"
            name="is_planned"
            checked={planned}
            onChange={(event) => setPlanned(event.target.checked)}
            className="size-5 accent-lime"
          />
          {t('planned')}
        </label>
        <p className="px-8 text-sm break-keep text-white/65">{t('plannedHint')}</p>
      </div>

      <div role="alert">
        {state && !state.ok ? <p className={MESSAGE}>{board(`errors.${state.error}`)}</p> : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY}>
          {pending ? board('saving') : board('save')}
        </button>
        <a href={`/${locale}/admin/activities`} className={OUTLINE}>
          {board('cancel')}
        </a>
      </div>
    </form>
  );
}

// A photo picked but not yet up, shown from the computer itself. The address it is drawn from is let
// go once the picture has been drawn.
function PickedPhoto({ file, alt }: { file: File; alt: string }) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onLoad={() => URL.revokeObjectURL(src)}
      className="aspect-[3/2] w-full rounded-xl object-cover"
    />
  );
}

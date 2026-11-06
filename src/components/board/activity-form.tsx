'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
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
  title_ko: string;
  title_en: string;
  city_ko: string;
  city_en: string;
  summary_ko: string;
  summary_en: string;
  photo: string | null;
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
    title_ko: activity?.title_ko ?? '',
    title_en: activity?.title_en ?? '',
    city_ko: activity?.city_ko ?? '',
    city_en: activity?.city_en ?? '',
    summary_ko: activity?.summary_ko ?? '',
    summary_en: activity?.summary_en ?? '',
  });
  const [planned, setPlanned] = useState(activity?.is_planned ?? false);
  const [photo, setPhoto] = useState(activity?.photo ?? null);
  const [photoProblem, setPhotoProblem] = useState<UploadError | null>(null);

  const [state, action, pending] = useActionState<BoardState, FormData>(async (previous, form) => {
    const save = activity ? updateActivity : createActivity;
    const file = fileRef.current?.files?.[0];
    if (!file) return save(previous, form);

    const uploaded = await uploadActivityPhoto(file);
    if ('error' in uploaded) {
      setPhotoProblem(uploaded.error);
      return null;
    }
    form.set('photo', uploaded.path);
    const result = await save(previous, form);
    // Saved, it redirects and never reaches this line. Refused, nothing points at the new file.
    await removeActivityPhoto(uploaded.path);
    return result;
  }, null);
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

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
        hint={name === 'date' ? t('dateHint') : undefined}
      />
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}
      <input type="hidden" name="photo" value={photo ?? ''} />

      <BoardPair>
        {field('title_ko', t('titleKo'), BOARD_LIMITS.activityTitle)}
        {field('title_en', t('titleEn'), BOARD_LIMITS.activityTitle)}
      </BoardPair>
      <div className={ROW}>{field('date', t('date'))}</div>
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
            <button type="button" className={TEXT_BUTTON} onClick={() => setPhoto(null)}>
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

      <BoardPair>
        {field('summary_ko', t('summaryKo'), BOARD_LIMITS.summary, 3)}
        {field('summary_en', t('summaryEn'), BOARD_LIMITS.summary, 3)}
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

'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createNotice, updateNotice } from '@/app/[locale]/admin/notices/actions';
import { MESSAGE, OUTLINE, PRIMARY, ROW } from '@/components/teams/form-parts';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { BOARD_LIMITS, type BoardState } from '@/lib/board/forms';
import { BoardField } from './fields';

type Notice = {
  id: string;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  is_pinned: boolean;
};

// To write a notice, or change one. React empties a form once its action has run, so the values are
// kept here and a refusal leaves what was typed in place.
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
  const [state, action, pending] = useActionState<BoardState, FormData>(
    notice ? updateNotice : createNotice,
    null,
  );
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

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

  return (
    <form ref={formRef} action={action} className="mt-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {notice ? <input type="hidden" name="id" value={notice.id} /> : null}
      {field('title_ko', t('titleKo'), BOARD_LIMITS.noticeTitle)}
      {field('body_ko', t('bodyKo'), BOARD_LIMITS.noticeBody, 10)}
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

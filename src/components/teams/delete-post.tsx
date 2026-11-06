'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { deletePost, type TeamActionState } from '@/app/[locale]/startups/[slug]/actions';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { MESSAGE, OUTLINE, TEXT_BUTTON } from './form-parts';

// Deleting asks once, in place, the way the members screen does: no modal.
export function DeletePost({ slug, id }: { slug: string; id: string }) {
  const t = useTranslations('Teams.form');
  const locale = useCurrentLocale();
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<TeamActionState, FormData>(deletePost, null);

  if (!asking) {
    return (
      <button type="button" className={OUTLINE} onClick={() => setAsking(true)}>
        {t('delete')}
      </button>
    );
  }
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <p className="text-lg font-semibold break-keep">{t('deleteQuestion')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" autoFocus disabled={pending} className={OUTLINE}>
          {t('deleteConfirm')}
        </button>
        <button type="button" className={TEXT_BUTTON} onClick={() => setAsking(false)}>
          {t('cancel')}
        </button>
      </div>
      <div role="alert">
        {state ? (
          <p className={MESSAGE}>
            {state.error === 'denied' ? t('errors.denied') : t('errors.failed')}
          </p>
        ) : null}
      </div>
    </form>
  );
}

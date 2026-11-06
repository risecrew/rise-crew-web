'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { MESSAGE, OUTLINE, TEXT_BUTTON } from '@/components/teams/form-parts';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import type { BoardState } from '@/lib/board/forms';

type Props = {
  id: string;
  question: string;
  action: (prev: BoardState, form: FormData) => Promise<BoardState>;
};

// Deleting cannot be undone, so it asks once, in place, the way a team post does: no modal.
export function DeleteItem({ id, question, action }: Props) {
  const t = useTranslations('Admin.board');
  const locale = useCurrentLocale();
  const [asking, setAsking] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);

  if (!asking) {
    return (
      <button type="button" className={OUTLINE} onClick={() => setAsking(true)}>
        {t('delete')}
      </button>
    );
  }
  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <p className="text-lg font-semibold break-keep">{question}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" autoFocus disabled={pending} className={OUTLINE}>
          {t('deleteConfirm')}
        </button>
        <button type="button" className={TEXT_BUTTON} onClick={() => setAsking(false)}>
          {t('cancel')}
        </button>
      </div>
      <div role="alert">
        {state && !state.ok ? (
          <p className={MESSAGE}>
            {t(state.error === 'failed' ? 'deleteFailed' : `errors.${state.error}`)}
          </p>
        ) : null}
      </div>
    </form>
  );
}

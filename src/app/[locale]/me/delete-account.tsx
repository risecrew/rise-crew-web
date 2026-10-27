'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { refreshAccount } from '@/components/site/account-store';
import { defaultLocale, isLocale } from '@/i18n/locales';
import type { DeletionState } from '@/lib/auth/deletion';
import { submitDeletion } from './actions';

// The end of My page: "Delete account", folded away until it is asked for. It is a plain
// <details>, so it opens with Enter or Space on its summary, a screen reader announces it as
// expanded or collapsed, and it works before the page's JavaScript has loaded. What opens is a
// plain form that asks for a word; the account is only deleted once it is typed.
//
// The control that deletes is an outline pill like the page's other secondary controls, not the
// lime pill that stands for the page's main action.
export function DeleteAccount() {
  const t = useTranslations('Auth.me.delete');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<DeletionState, FormData>(
    submitDeletion,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // After a refusal focus goes back to the field, so someone using the keyboard or a screen reader
  // is where the problem is (the message itself is an alert, which is read out as it appears).
  useEffect(() => {
    if (state) inputRef.current?.focus();
  }, [state]);

  // The header remembers who signed in, and the browser's copy of the session is gone once the
  // account is, so the header has to look again or it keeps showing the account. A deleted account
  // sends nothing back (the visitor is redirected), so a submit that ends in the state it started
  // from went through. The page may already be gone by then, which is what the second effect is
  // for. (The same as the profile form after a save.)
  const sentFrom = useRef<DeletionState | undefined>(undefined);
  useEffect(() => {
    if (pending) return;
    if (sentFrom.current !== undefined && sentFrom.current === state) refreshAccount();
    sentFrom.current = undefined;
  }, [pending, state]);
  useEffect(
    () => () => {
      if (sentFrom.current !== undefined) refreshAccount();
    },
    [],
  );

  const word = t('word');
  const message = state ? t(`errors.${state.error}`, { word }) : null;
  const wrongWord = state?.error === 'confirm';

  return (
    // A refusal comes back with the step open, also for a form post that never ran any script.
    <details open={state ? true : undefined} className="mt-10 border-t border-white/15 pt-3">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded text-base text-white/70 underline underline-offset-4 hover:text-white [&::-webkit-details-marker]:hidden">
        {t('summary')}
      </summary>

      <div className="pt-5">
        <h2 className="font-display text-2xl leading-tight font-[850] text-balance break-keep">
          {t('title')}
        </h2>
        <p className="mt-3 text-base text-pretty break-keep text-white/75">{t('body')}</p>

        <form
          action={formAction}
          onSubmit={() => {
            sentFrom.current = state;
          }}
          className="mt-6"
        >
          <input type="hidden" name="locale" value={isLocale(locale) ? locale : defaultLocale} />
          <label htmlFor="delete-confirm" className="block text-sm font-medium text-white/75">
            {t.rich('prompt', {
              word,
              strong: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
            })}
          </label>
          <input
            ref={inputRef}
            id="delete-confirm"
            name="confirm"
            type="text"
            defaultValue={state?.typed ?? ''}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-required="true"
            aria-invalid={wrongWord ? true : undefined}
            aria-describedby={message ? 'delete-confirm-message' : undefined}
            className="mt-2 w-full rounded-full border border-white/50 bg-white/5 px-5 py-3.5 text-base text-white aria-invalid:border-white"
          />
          {/* An alert, because focus is often on the field already (Enter sends the form), and
              moving focus to where it is says nothing. The key makes the same refusal a new
              element each time, which a screen reader reads out again. */}
          {message ? (
            <p
              key={state?.at}
              id="delete-confirm-message"
              role="alert"
              className="mt-2 px-2 text-base text-pretty break-keep text-white"
            >
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-white/50 px-6 py-3 font-semibold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/10 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </details>
  );
}

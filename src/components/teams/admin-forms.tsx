'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import {
  addTeamMember,
  createTeam,
  removeTeamMember,
  setPostHidden,
  updateTeamSettings,
  type TeamAdminState,
} from '@/app/[locale]/admin/teams/actions';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { TEAM_FIELDS } from '@/lib/teams/fields';
import { TEAM_LIMITS } from '@/lib/teams/forms';
import { FIELD, LABEL, MESSAGE, OUTLINE, PRIMARY, ROW, TEXT_BUTTON } from './form-parts';

type Team = {
  id: string;
  slug: string;
  name: string;
  field: string;
  cohort: number;
  is_published: boolean;
};

function useErrorSentence() {
  const t = useTranslations('Admin.teams.errors');
  return (state: TeamAdminState): string | null => {
    if (!state || state.ok) return null;
    return t(state.error);
  };
}

// The name, field and cohort of a team: to create one, or, with the publish switch, to
// change one. React empties a form once its action has run, so the values are kept here and a
// refusal leaves what was typed in place.
export function TeamSettingsForm({ team }: { team?: Team }) {
  const t = useTranslations('Admin.teams');
  const fieldNames = useTranslations('Teams.fields');
  const sentence = useErrorSentence();
  const locale = useCurrentLocale();
  const [state, action, pending] = useActionState<TeamAdminState, FormData>(
    team ? updateTeamSettings : createTeam,
    null,
  );
  const fields = state && !state.ok ? (state.fields ?? {}) : {};
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(team?.name ?? '');
  const [field, setField] = useState(team?.field ?? 'other');
  const [cohort, setCohort] = useState(team ? String(team.cohort) : '');
  const [published, setPublished] = useState(team?.is_published ?? false);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function message(name: string): string | null {
    const code = fields[name];
    if (!code) return null;
    if (code === 'required') return t('fieldErrors.required');
    if (code === 'tooLong') return t('fieldErrors.tooLong');
    return t('fieldErrors.invalid');
  }

  return (
    <form ref={formRef} action={action} className="mt-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {team ? <input type="hidden" name="team_id" value={team.id} /> : null}

      <div className={ROW}>
        <label htmlFor="team-name" className={LABEL}>
          {t('name')}
        </label>
        <input
          id="team-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={TEAM_LIMITS.name}
          aria-invalid={message('name') ? true : undefined}
          className={FIELD}
        />
        {message('name') ? <p className={MESSAGE}>{message('name')}</p> : null}
      </div>

      <div className={`${ROW} grid gap-5 sm:grid-cols-2`}>
        <div>
          <label htmlFor="team-field" className={LABEL}>
            {t('field')}
          </label>
          <select
            id="team-field"
            name="field"
            value={field}
            onChange={(event) => setField(event.target.value)}
            className={FIELD}
          >
            {TEAM_FIELDS.map((option) => (
              <option key={option} value={option} className="text-black">
                {fieldNames(option)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="team-cohort" className={LABEL}>
            {t('cohort')}
          </label>
          <input
            id="team-cohort"
            name="cohort"
            inputMode="numeric"
            value={cohort}
            onChange={(event) => setCohort(event.target.value)}
            aria-invalid={message('cohort') ? true : undefined}
            className={FIELD}
          />
          {message('cohort') ? <p className={MESSAGE}>{message('cohort')}</p> : null}
        </div>
      </div>

      {team ? (
        <div className={ROW}>
          <label className="flex min-h-11 items-center gap-3 text-base text-white/85">
            <input
              type="checkbox"
              name="is_published"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="size-6 cursor-pointer appearance-none rounded-sm border border-white/50 bg-white/5 checked:border-lime checked:bg-lime"
            />
            {t('published')}
          </label>
          <p className="mt-1 text-sm break-keep text-white/75">{t('publishedHint')}</p>
        </div>
      ) : null}

      <div className="border-t border-white/15 pt-5">
        <div role="status">
          {state?.ok ? <p className={`${MESSAGE} mb-4`}>{t('saved')}</p> : null}
        </div>
        <div role="alert">
          {sentence(state) ? <p className={`${MESSAGE} mb-4`}>{sentence(state)}</p> : null}
        </div>
        <button type="submit" disabled={pending} className={PRIMARY}>
          {team ? t('save') : t('create')}
        </button>
      </div>
    </form>
  );
}

export function AddMemberForm({ teamId }: { teamId: string }) {
  const t = useTranslations('Admin.teams');
  const sentence = useErrorSentence();
  const locale = useCurrentLocale();
  const [state, action, pending] = useActionState<TeamAdminState, FormData>(addTeamMember, null);
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  return (
    <form action={action} className="mt-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="team_id" value={teamId} />
      <label htmlFor="member-email" className={LABEL}>
        {t('memberEmail')}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="member-email"
          name="email"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          aria-invalid={fields.email ? true : undefined}
          className={FIELD}
        />
        <button type="submit" disabled={pending} className={`${OUTLINE} mt-2 shrink-0`}>
          {t('addMember')}
        </button>
      </div>
      <div role="alert">
        {fields.email ? (
          <p className={MESSAGE}>{t('fieldErrors.required')}</p>
        ) : sentence(state) && state && !state.ok && state.error !== 'invalid' ? (
          <p className={MESSAGE}>{sentence(state)}</p>
        ) : null}
      </div>
    </form>
  );
}

export function RemoveMemberButton({
  teamId,
  userId,
  label,
}: {
  teamId: string;
  userId: string;
  label: string;
}) {
  const t = useTranslations('Admin.teams');
  const sentence = useErrorSentence();
  const locale = useCurrentLocale();
  const [state, action, pending] = useActionState<TeamAdminState, FormData>(removeTeamMember, null);
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" disabled={pending} aria-label={label} className={TEXT_BUTTON}>
        {t('removeMember')}
      </button>
      <div role="alert">
        {sentence(state) ? <p className={MESSAGE}>{sentence(state)}</p> : null}
      </div>
    </form>
  );
}

// Hides a post or brings it back. Reversible, and the team still sees the post, so it does not ask.
export function HidePostButton({
  postId,
  hidden,
  label,
  variant = 'outline',
}: {
  postId: string;
  hidden: boolean;
  label?: string;
  variant?: 'outline' | 'text';
}) {
  const t = useTranslations('Admin.teams');
  const sentence = useErrorSentence();
  const locale = useCurrentLocale();
  const [state, action, pending] = useActionState<TeamAdminState, FormData>(setPostHidden, null);
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="hidden" value={hidden ? '0' : '1'} />
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        className={variant === 'outline' ? OUTLINE : TEXT_BUTTON}
      >
        {hidden ? t('unhide') : t('hide')}
      </button>
      <div role="alert">
        {sentence(state) ? <p className={MESSAGE}>{sentence(state)}</p> : null}
      </div>
    </form>
  );
}

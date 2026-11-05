'use client';

import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';
import { saveIntro, type TeamActionState } from '@/app/[locale]/startups/[slug]/actions';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { Link } from '@/i18n/navigation';
import { TEAM_LIMITS, TEAM_LINK_KINDS, checkPhoto, type TeamLink } from '@/lib/teams/forms';
import { removeLogo, uploadLogo } from '@/lib/teams/upload';
import { AREA, FIELD, LABEL, MESSAGE, OUTLINE, PRIMARY, ROW, TEXT_BUTTON } from './form-parts';

type Props = {
  team: {
    id: string;
    slug: string;
    tagline: string;
    intro: string;
    logo_path: string | null;
    links: TeamLink[];
  };
};

// The intro of a team, in the team's own words. The logo goes up from the browser first, and is
// taken down again if the save is refused.
export function IntroForm({ team }: Props) {
  const t = useTranslations('Teams.form');
  const kinds = useTranslations('Teams.linkKinds');
  const locale = useCurrentLocale();
  const [pending, start] = useTransition();
  const [state, setState] = useState<TeamActionState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tagline, setTagline] = useState(team.tagline);
  const [intro, setIntro] = useState(team.intro);
  const [links, setLinks] = useState<{ key: number; kind: string; url: string }[]>(
    team.links.map((link, key) => ({ key, ...link })),
  );
  const [nextKey, setNextKey] = useState(team.links.length);
  const [logo, setLogo] = useState<File | null>(null);
  const [dropLogo, setDropLogo] = useState(false);

  const fields = state?.fields ?? {};

  function message(name: string): string | undefined {
    const code = fields[name];
    if (!code) return undefined;
    if (code === 'invalidUrl') return t('errors.invalidUrl');
    if (code === 'tooLong') return t('errors.tooLong');
    return t('errors.invalid');
  }

  function pickLogo(input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    setNotice(null);
    if (file) {
      const check = checkPhoto(file, TEAM_LIMITS.logoBytes);
      if (check !== 'ok') {
        setNotice(check === 'tooLarge' ? t('errors.logoTooLarge') : t('errors.badType'));
        setLogo(null);
        // A refused file does not stay named in the field, where it would look chosen.
        input.value = '';
        return;
      }
    }
    setLogo(file);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      setNotice(null);
      setState(null);
      let uploaded: string | null = null;
      if (logo) {
        const result = await uploadLogo(team.id, logo);
        if ('error' in result) {
          setNotice(t('errors.uploadFailed'));
          return;
        }
        uploaded = result.path;
      }
      form.set('logo_change', uploaded ? 'new' : dropLogo ? 'remove' : 'keep');
      if (uploaded) form.set('logo_path', uploaded);
      let result: TeamActionState;
      try {
        result = await saveIntro(null, form);
      } catch (error) {
        // A redirect after a save arrives as a throw, and must go on. Anything else means the answer
        // never came, and the logo may be in use, so it stays.
        unstable_rethrow(error);
        setState({ ok: false, error: 'failed' });
        return;
      }
      if (result) {
        setState(result);
        if (uploaded) await removeLogo(uploaded);
      }
    });
  }

  const formError =
    state?.error === 'denied'
      ? t('errors.denied')
      : state?.error === 'failed'
        ? t('errors.failed')
        : state?.error === 'invalid'
          ? t('errors.summary')
          : null;

  return (
    <form onSubmit={onSubmit} className="mt-10" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={team.slug} />

      <div className={ROW}>
        <label htmlFor="team-logo" className={LABEL}>
          {t('logo')}
        </label>
        <input
          id="team-logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => pickLogo(event.target)}
          className="mt-3 block w-full text-base text-white/85 file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-5 file:py-2.5 file:font-semibold file:text-white"
        />
        <p className="mt-2 px-2 text-sm text-white/75">{t('logoHint')}</p>
        {team.logo_path && !logo ? (
          <label className="mt-2 flex min-h-11 items-center gap-3 px-2 text-base text-white/85">
            <input
              type="checkbox"
              checked={dropLogo}
              onChange={(event) => setDropLogo(event.target.checked)}
              className="size-6 cursor-pointer appearance-none rounded-sm border border-white/50 bg-white/5 checked:border-lime checked:bg-lime"
            />
            {t('removeLogo')}
          </label>
        ) : null}
      </div>

      <div className={ROW}>
        <label htmlFor="team-tagline" className={LABEL}>
          {t('tagline')}
        </label>
        <input
          id="team-tagline"
          name="tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={TEAM_LIMITS.tagline}
          aria-invalid={message('tagline') ? true : undefined}
          className={FIELD}
        />
        {message('tagline') ? <p className={MESSAGE}>{message('tagline')}</p> : null}
      </div>

      <div className={ROW}>
        <label htmlFor="team-intro" className={LABEL}>
          {t('intro')}
        </label>
        <textarea
          id="team-intro"
          name="intro"
          rows={8}
          value={intro}
          onChange={(event) => setIntro(event.target.value)}
          maxLength={TEAM_LIMITS.intro}
          aria-invalid={message('intro') ? true : undefined}
          className={AREA}
        />
        {message('intro') ? <p className={MESSAGE}>{message('intro')}</p> : null}
      </div>

      <fieldset className={ROW}>
        <legend className={`${LABEL} float-left mb-2 w-full`}>{t('links')}</legend>
        <div className="clear-both flex flex-col gap-4">
          {links.map((link, index) => (
            <div key={link.key}>
              <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <label className="block">
                  <span className={LABEL}>{t('linkKind')}</span>
                  <select
                    name="link_kind"
                    value={link.kind}
                    onChange={(event) =>
                      setLinks((all) =>
                        all.map((item) =>
                          item.key === link.key ? { ...item, kind: event.target.value } : item,
                        ),
                      )
                    }
                    className={FIELD}
                  >
                    {TEAM_LINK_KINDS.map((kind) => (
                      <option key={kind} value={kind} className="text-black">
                        {kinds(kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={LABEL}>{t('linkUrl')}</span>
                  <input
                    name="link_url"
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    value={link.url}
                    onChange={(event) =>
                      setLinks((all) =>
                        all.map((item) =>
                          item.key === link.key ? { ...item, url: event.target.value } : item,
                        ),
                      )
                    }
                    aria-invalid={message(`links.${index}.url`) ? true : undefined}
                    className={FIELD}
                  />
                </label>
              </div>
              {message(`links.${index}.url`) ? (
                <p className={MESSAGE}>{message(`links.${index}.url`)}</p>
              ) : null}
              <button
                type="button"
                className={TEXT_BUTTON}
                onClick={() => setLinks((all) => all.filter((item) => item.key !== link.key))}
              >
                {t('removeLink', { number: index + 1 })}
              </button>
            </div>
          ))}
        </div>
        {links.length < TEAM_LIMITS.links ? (
          <button
            type="button"
            className={`${OUTLINE} mt-4`}
            onClick={() => {
              setLinks((all) => [...all, { key: nextKey, kind: 'homepage', url: '' }]);
              setNextKey((key) => key + 1);
            }}
          >
            {t('addLink')}
          </button>
        ) : null}
      </fieldset>

      <div className="border-t border-white/15 pt-5">
        <div role="status" aria-live="polite">
          {notice ? <p className={`${MESSAGE} mb-4`}>{notice}</p> : null}
        </div>
        <div role="alert">
          {formError ? <p className={`${MESSAGE} mb-4`}>{formError}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={PRIMARY}>
            {t('save')}
          </button>
          <Link href={`/startups/${team.slug}`} className={TEXT_BUTTON}>
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}

'use client';

import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';
import { saveIntro, type TeamActionState } from '@/app/[locale]/startups/[slug]/actions';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { Link } from '@/i18n/navigation';
import { TEAM_LIMITS, TEAM_LINK_KINDS, checkPhoto, type TeamLink } from '@/lib/teams/forms';
import { removeTeamImage, uploadTeamImage, type UploadError } from '@/lib/teams/upload';
import { FieldNotice } from './field-notice';
import {
  AREA,
  FIELD,
  LABEL,
  MESSAGE,
  OUTLINE,
  PRIMARY,
  ROW,
  SELECT,
  TEXT_BUTTON,
} from './form-parts';
import { SelectChevron } from './select-chevron';

type Props = {
  team: {
    id: string;
    slug: string;
    tagline: string;
    intro: string;
    logo_path: string | null;
    cover_path: string | null;
    links: TeamLink[];
  };
};

// The intro of a team, in the team's own words. The logo and cover go up from the browser first, and
// are taken down again if the save is refused.
export function IntroForm({ team }: Props) {
  const t = useTranslations('Teams.form');
  const kinds = useTranslations('Teams.linkKinds');
  const locale = useCurrentLocale();
  const [pending, start] = useTransition();
  const [state, setState] = useState<TeamActionState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [coverNotice, setCoverNotice] = useState<string | null>(null);
  const [tagline, setTagline] = useState(team.tagline);
  const [intro, setIntro] = useState(team.intro);
  const [links, setLinks] = useState<{ key: number; kind: string; url: string }[]>(
    team.links.map((link, key) => ({ key, ...link })),
  );
  const [nextKey, setNextKey] = useState(team.links.length);
  const [logo, setLogo] = useState<File | null>(null);
  const [dropLogo, setDropLogo] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [dropCover, setDropCover] = useState(false);

  const fields = state?.fields ?? {};

  function message(name: string): string | undefined {
    const code = fields[name];
    if (!code) return undefined;
    if (code === 'invalidUrl') return t('errors.invalidUrl');
    if (code === 'tooLong') return t('errors.tooLong');
    return t('errors.invalid');
  }

  // A refused file does not stay named in the field, where it would look chosen.
  function pickImage(
    input: HTMLInputElement,
    keep: (file: File | null) => void,
    say: (text: string | null) => void,
  ) {
    const file = input.files?.[0] ?? null;
    say(null);
    if (file) {
      const check = checkPhoto(file, TEAM_LIMITS.inputBytes);
      if (check !== 'ok') {
        say(check === 'tooLarge' ? t('errors.tooLarge') : t('errors.badType'));
        keep(null);
        input.value = '';
        return;
      }
    }
    keep(file);
  }

  function uploadSentence(error: UploadError): string {
    if (error === 'denied') return t('errors.denied');
    if (error === 'tooLarge') return t('errors.tooLarge');
    if (error === 'badType') return t('errors.badType');
    if (error === 'unreadable') return t('errors.unreadable');
    return t('errors.uploadFailed');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      setNotice(null);
      setLogoNotice(null);
      setCoverNotice(null);
      setState(null);
      let newLogo: string | null = null;
      if (logo) {
        const result = await uploadTeamImage('team-logos', team.id, logo);
        if ('error' in result) {
          setNotice(uploadSentence(result.error));
          return;
        }
        newLogo = result.path;
      }
      let newCover: string | null = null;
      if (cover) {
        const result = await uploadTeamImage('team-covers', team.id, cover);
        if ('error' in result) {
          setNotice(uploadSentence(result.error));
          if (newLogo) await removeTeamImage('team-logos', newLogo);
          return;
        }
        newCover = result.path;
      }
      form.set('logo_change', newLogo ? 'new' : dropLogo ? 'remove' : 'keep');
      if (newLogo) form.set('logo_path', newLogo);
      form.set('cover_change', newCover ? 'new' : dropCover ? 'remove' : 'keep');
      if (newCover) form.set('cover_path', newCover);
      let result: TeamActionState;
      try {
        result = await saveIntro(null, form);
      } catch (error) {
        // A redirect after a save arrives as a throw, and must go on. Anything else means the answer
        // never came, and the images may be in use, so they stay.
        unstable_rethrow(error);
        setState({ ok: false, error: 'failed' });
        return;
      }
      if (result) {
        setState(result);
        if (newLogo) await removeTeamImage('team-logos', newLogo);
        if (newCover) await removeTeamImage('team-covers', newCover);
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
          onChange={(event) => pickImage(event.target, setLogo, setLogoNotice)}
          className="mt-3 block w-full text-base text-white/85 file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-5 file:py-2.5 file:font-semibold file:text-white"
        />
        <FieldNotice text={logoNotice} />
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
        <label htmlFor="team-cover" className={LABEL}>
          {t('cover')}
        </label>
        <input
          id="team-cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => pickImage(event.target, setCover, setCoverNotice)}
          className="mt-3 block w-full text-base text-white/85 file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-5 file:py-2.5 file:font-semibold file:text-white"
        />
        <FieldNotice text={coverNotice} />
        <p className="mt-2 px-2 text-sm break-keep text-white/75">{t('coverHint')}</p>
        {team.cover_path && !cover ? (
          <label className="mt-2 flex min-h-11 items-center gap-3 px-2 text-base text-white/85">
            <input
              type="checkbox"
              checked={dropCover}
              onChange={(event) => setDropCover(event.target.checked)}
              className="size-6 cursor-pointer appearance-none rounded-sm border border-white/50 bg-white/5 checked:border-lime checked:bg-lime"
            />
            {t('removeCover')}
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
                  <span className="relative mt-2 block">
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
                      className={SELECT}
                    >
                      {TEAM_LINK_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kinds(kind)}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </span>
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

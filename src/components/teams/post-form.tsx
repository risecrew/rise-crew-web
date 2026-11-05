'use client';

import Image from 'next/image';
import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import {
  createPost,
  updatePost,
  type TeamActionState,
} from '@/app/[locale]/startups/[slug]/actions';
import { useCurrentLocale } from '@/i18n/use-current-locale';
import { Link } from '@/i18n/navigation';
import { TEAM_LIMITS, TEAM_POST_VISIBILITIES, checkPhoto } from '@/lib/teams/forms';
import { removePhotos, uploadPhotos } from '@/lib/teams/upload';
import { AREA, FIELD, LABEL, MESSAGE, PRIMARY, ROW, TEXT_BUTTON } from './form-parts';

type Existing = {
  id: string;
  title: string;
  body: string;
  visibility: string;
  photos: { path: string; url: string | null }[];
};

type Props = {
  team: { id: string; slug: string };
  // The post being changed; a new post has none.
  post?: Existing;
};

// The form a team member writes in. Photos need the browser (they go straight to Storage), so the
// form is driven from here: pick an id, send the photos up, then save the post with their paths.
// If anything fails nothing stays behind, and everything typed is still in the form.
export function PostForm({ team, post }: Props) {
  const t = useTranslations('Teams.form');
  const v = useTranslations('Teams.visibility');
  const locale = useCurrentLocale();
  const [pending, start] = useTransition();
  const [state, setState] = useState<TeamActionState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [visibility, setVisibility] = useState(post?.visibility ?? 'public');
  const [kept, setKept] = useState(post?.photos ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<File[]>([]);
  // Kept between tries, so sending again after a lost answer cannot post twice.
  const postId = useRef(post?.id ?? '');
  // Photos already up from a try whose answer got lost: sending again does not upload them again.
  const uploaded = useRef<string[]>([]);

  const fields = state?.fields ?? {};
  const room = TEAM_LIMITS.photos - kept.length - added.length;

  function message(name: string): string | undefined {
    const code = fields[name];
    if (!code) return undefined;
    if (code === 'required') return t('errors.titleRequired');
    if (code === 'tooLong') return t('errors.tooLong');
    return t('errors.invalid');
  }

  function pickPhotos(files: File[]) {
    setNotice(null);
    if (files.length > room) {
      setNotice(t('errors.tooMany'));
      return;
    }
    for (const file of files) {
      const check = checkPhoto(file, TEAM_LIMITS.photoBytes);
      if (check !== 'ok') {
        setNotice(check === 'tooLarge' ? t('errors.tooLarge') : t('errors.badType'));
        return;
      }
    }
    setAdded((all) => [...all, ...files]);
    uploaded.current = [];
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      setNotice(null);
      setState(null);
      if (!postId.current) postId.current = crypto.randomUUID();
      const id = postId.current;
      if (uploaded.current.length === 0) {
        const upload = await uploadPhotos(team.id, id, added);
        if ('error' in upload) {
          setNotice(
            upload.error === 'tooLarge'
              ? t('errors.tooLarge')
              : upload.error === 'badType'
                ? t('errors.badType')
                : t('errors.uploadFailed'),
          );
          return;
        }
        uploaded.current = upload.paths;
      }
      form.set('id', id);
      for (const path of uploaded.current) form.append('photo_path', path);
      for (const path of removed) form.append('removed_path', path);

      let result: TeamActionState;
      try {
        result = await (post ? updatePost : createPost)(null, form);
      } catch (error) {
        // A redirect after a save arrives as a throw, and must go on. Anything else means the answer
        // never came: the save may or may not have happened, so the photos stay and a second try
        // uses them.
        unstable_rethrow(error);
        setState({ ok: false, error: 'failed' });
        return;
      }
      if (result) {
        setState(result);
        await removePhotos(uploaded.current);
        uploaded.current = [];
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
        <label htmlFor="post-title" className={LABEL}>
          {t('postTitle')}
        </label>
        <input
          id="post-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TEAM_LIMITS.postTitle}
          aria-invalid={message('title') ? true : undefined}
          className={FIELD}
        />
        {message('title') ? <p className={MESSAGE}>{message('title')}</p> : null}
      </div>

      <div className={ROW}>
        <label htmlFor="post-body" className={LABEL}>
          {t('postBody')}
        </label>
        <textarea
          id="post-body"
          name="body"
          rows={10}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={TEAM_LIMITS.postBody}
          aria-invalid={message('body') ? true : undefined}
          className={AREA}
        />
        {message('body') ? <p className={MESSAGE}>{message('body')}</p> : null}
      </div>

      <div className={ROW}>
        <label htmlFor="post-photos" className={LABEL}>
          {t('addPhotos')}
        </label>
        <input
          id="post-photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={room <= 0}
          onChange={(event) => {
            pickPhotos(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
          className="mt-3 block w-full text-base text-white/85 file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-white/50 file:bg-transparent file:px-5 file:py-2.5 file:font-semibold file:text-white disabled:opacity-60"
        />
        <p className="mt-2 px-2 text-sm break-keep text-white/75">{t('photoHint')}</p>
        <p className="mt-1 px-2 text-sm break-keep text-white/75">{t('photoNotice')}</p>

        {kept.length + added.length > 0 ? (
          <ul className="mt-4 flex flex-col">
            {kept.map((photo, index) => (
              <li
                key={photo.path}
                className="flex items-center justify-between gap-3 border-t border-white/15 py-2"
              >
                {photo.url ? (
                  <Image
                    src={photo.url}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="size-16 rounded-lg object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  className={TEXT_BUTTON}
                  onClick={() => {
                    setKept((all) => all.filter((p) => p.path !== photo.path));
                    setRemoved((all) => [...all, photo.path]);
                  }}
                >
                  {t('removePhoto', { number: index + 1 })}
                </button>
              </li>
            ))}
            {added.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 border-t border-white/15 py-2"
              >
                <span className="min-w-0 break-all">{file.name}</span>
                <button
                  type="button"
                  className={TEXT_BUTTON}
                  onClick={() => {
                    setAdded((all) => all.filter((_, i) => i !== index));
                    uploaded.current = [];
                  }}
                >
                  {t('removePhoto', { number: kept.length + index + 1 })}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={ROW} role="radiogroup" aria-labelledby="post-visibility-legend">
        <p id="post-visibility-legend" className={LABEL}>
          {t('visibility')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEAM_POST_VISIBILITIES.map((option) => (
            <label key={option} className="group relative cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={option}
                checked={visibility === option}
                onChange={() => setVisibility(option)}
                className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
              />
              <span className="inline-flex items-center rounded-full border border-white/25 px-4 py-2.5 text-base font-semibold break-keep text-white transition-[background-color,color,border-color,transform] duration-150 ease-out not-peer-checked:group-hover:bg-white/10 peer-checked:border-white peer-checked:bg-white peer-checked:text-stage peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-lime peer-active:scale-[0.97]">
                {v(option)}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 px-2 text-sm break-keep text-white/75">
          {t(`visibilityHint.${visibility}`)}
        </p>
      </div>

      <div className="border-t border-white/15 pt-5">
        <div role="status" aria-live="polite">
          {notice ? <p className={`${MESSAGE} mb-4`}>{notice}</p> : null}
        </div>
        <div role="alert">
          {formError ? <p className={`${MESSAGE} mb-4`}>{formError}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={PRIMARY}>
            {post ? t('save') : t('publish')}
          </button>
          <Link
            href={post ? `/startups/${team.slug}/posts/${post.id}` : `/startups/${team.slug}`}
            className={TEXT_BUTTON}
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}

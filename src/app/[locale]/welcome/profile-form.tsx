'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { refreshAccount } from '@/components/site/account-store';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { NAME_MAX, OCCUPATIONS, TEXT_MAX, isStudent } from '@/lib/auth/occupation';
import {
  EMPTY_PROFILE_VALUES,
  type ProfileFormState,
  type ProfileFormValues,
} from '@/lib/auth/profile-values';
import { cn } from '@/lib/utils';
import { submitProfile } from './actions';

type Props = {
  // `welcome` finishes a sign-up; `edit` changes the profile of an account that has one.
  mode: 'welcome' | 'edit';
  // The account's address: shown, never asked for.
  email: string;
  // Where to go once it is saved. The action vets it whatever this says.
  next?: string | null;
  // What the form starts with: nothing for a new account, the saved profile for an edit.
  initial?: Partial<ProfileFormValues>;
};

// The field look of the login page: a pill outline, a full white border when it has a message.
const FIELD =
  'mt-2 w-full rounded-full border border-white/50 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/55 aria-invalid:border-white';
const LABEL = 'block text-sm font-medium text-white/75';
const MESSAGE = 'mt-2 px-2 text-base text-pretty break-keep text-white';
const ROW = 'border-t border-white/15 py-5';

const NO_NAMES: ReadonlySet<string> = new Set();

function useCurrentLocale(): Locale {
  const locale = useLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

export function ProfileForm({ mode, email, next = null, initial }: Props) {
  const t = useTranslations('Auth.profile');
  const locale = useCurrentLocale();
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    submitProfile,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // After a refusal the form shows what was sent back, because the browser clears a form once its
  // action has run. Before that it starts from `initial`.
  const values = state?.values ?? { ...EMPTY_PROFILE_VALUES, ...initial };
  const errors = state?.fieldErrors ?? {};

  // A message goes away once its field is touched. What was touched is kept per refusal, so the
  // next refusal starts with all of its messages showing.
  const [touched, setTouched] = useState<{ for: ProfileFormState; names: ReadonlySet<string> }>({
    for: null,
    names: NO_NAMES,
  });
  const dismissed = touched.for === state ? touched.names : NO_NAMES;

  function messageFor(name: string): string | undefined {
    const code = errors[name];
    if (!code || dismissed.has(name)) return undefined;
    if (code === 'too_long') {
      return t('errors.tooLong', { max: name.endsWith('_name') ? NAME_MAX : TEXT_MAX });
    }
    if (code === 'consent_required') return t(`errors.consent.${name}`);
    return t(`errors.required.${name}`);
  }

  function onChange(event: FormEvent<HTMLFormElement>) {
    const field = (event.target as HTMLInputElement).name;
    // Another occupation also settles what was said about the fields that go with it.
    const touchedNow = field === 'occupation' ? ['occupation', 'school', 'major'] : [field];
    setTouched((before) => ({
      for: state,
      names: new Set([...(before.for === state ? before.names : NO_NAMES), ...touchedNow]),
    }));
  }

  // After a refusal focus goes to the first field with a message (the first radio, for the
  // occupation), so someone using the keyboard or a screen reader lands where the problem is.
  useEffect(() => {
    if (!state) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = field?.matches('[role="radiogroup"]') ? field.querySelector('input') : field;
    target?.focus();
  }, [state]);

  // The header remembers the name it read when the visitor signed in, so after a save it has to
  // read it again or it keeps the old initial. A saved form sends nothing back (the visitor is
  // redirected), so a submit that ends in the state it started from was saved. The page may
  // already be gone by then, which is what the second effect is for.
  const sentFrom = useRef<ProfileFormState | undefined>(undefined);
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

  const invalid = Object.keys(errors).filter((name) => name !== 'form');
  const stillShown = invalid.some((name) => messageFor(name));
  const summary = errors.form
    ? t('errors.saveFailed')
    : stillShown
      ? t('errors.summary', { count: invalid.length })
      : null;

  const nameFields = (
    locale === 'ko' ? ['last_name', 'first_name'] : ['first_name', 'last_name']
  ) as ('last_name' | 'first_name')[];

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={onChange}
      onSubmit={() => {
        sentFrom.current = state;
      }}
      className="group/form mt-10"
    >
      {/* What the action needs to know besides the fields. They ride along as fields, not as
          arguments bound to the action: React cannot show a form again after a refusal (the
          plain-post path) when the action has bound arguments, and renders it forever. The action
          vets all three, as it would anything else the browser sends. */}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value={mode} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <dl className={ROW}>
        <dt className="text-sm font-medium text-white/60">
          {t('email')} <span>{t('emailNote')}</span>
        </dt>
        <dd className="mt-1 text-lg font-semibold break-all text-white">{email}</dd>
      </dl>

      <div className={cn(ROW, 'grid grid-cols-2 gap-3')}>
        {nameFields.map((name) => (
          <TextField
            key={name}
            name={name}
            label={t(name === 'last_name' ? 'lastName' : 'firstName')}
            value={values[name]}
            message={messageFor(name)}
            maxLength={NAME_MAX}
            autoComplete={name === 'last_name' ? 'family-name' : 'given-name'}
          />
        ))}
      </div>

      <div className={ROW}>
        <OccupationChoice value={values.occupation} message={messageFor('occupation')} />

        {/* What goes with the choice appears by CSS alone (the checked radio decides), so the form
            asks the right questions before the page's JavaScript has loaded. A field that stays
            hidden is still sent; the server drops what does not apply to the chosen occupation. */}
        <div className="mt-5 hidden gap-5 group-has-[input[data-kind=student]:checked]/form:grid">
          <TextField
            name="school"
            label={t('school')}
            value={values.school}
            message={messageFor('school')}
            maxLength={TEXT_MAX}
          />
          <TextField
            name="major"
            label={t('major')}
            value={values.major}
            message={messageFor('major')}
            maxLength={TEXT_MAX}
          />
        </div>
        <div className="mt-5 hidden group-has-[input[data-kind=other]:checked]/form:block">
          <TextField
            name="affiliation"
            label={t('affiliation')}
            value={values.affiliation}
            message={messageFor('affiliation')}
            maxLength={TEXT_MAX}
            autoComplete="organization"
            placeholder={t('affiliationPlaceholder')}
            required={false}
          />
        </div>
      </div>

      {mode === 'welcome' ? (
        <>
          <Consent
            name="age14"
            checked={values.age14}
            message={messageFor('age14')}
            label={t('consents.age14')}
          />
          <Consent
            name="privacy"
            checked={values.privacy}
            message={messageFor('privacy')}
            label={t('consents.privacy')}
            link={
              <>
                (
                <Link
                  href="/privacy"
                  target="_blank"
                  prefetch={false}
                  aria-label={t('consents.privacyLinkLabel')}
                  className="underline underline-offset-4"
                >
                  {t('consents.privacyLink')}
                </Link>
                )
              </>
            }
          />
        </>
      ) : null}
      <Consent name="recruit" checked={values.recruit} label={t('consents.recruit')} />

      <div className="border-t border-white/15 pt-6">
        {summary ? (
          <p
            key={state?.at}
            role="alert"
            className="mb-4 text-base text-pretty break-keep text-white"
          >
            {summary}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3 font-semibold text-cobalt transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
        >
          {t(pending ? `submitting.${mode}` : `submit.${mode}`)}
        </button>
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  value,
  message,
  maxLength,
  autoComplete,
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  value: string;
  message: string | undefined;
  maxLength: number;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = `profile-${name}`;
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        defaultValue={value}
        maxLength={maxLength}
        autoComplete={autoComplete ?? 'off'}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        className={FIELD}
      />
      {message ? (
        <p id={`${id}-message`} className={MESSAGE}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

// Pill radios: real radio buttons (one tab stop, arrow keys to choose) drawn as pills. The input
// lies invisibly over its pill, so a click lands on the input itself and it keeps its focus and
// checked state; the pill shows them.
function OccupationChoice({ value, message }: { value: string; message: string | undefined }) {
  const t = useTranslations('Auth.profile.occupation');
  return (
    <div
      role="radiogroup"
      aria-required="true"
      aria-labelledby="profile-occupation-legend"
      aria-invalid={message ? true : undefined}
      aria-describedby={message ? 'profile-occupation-message' : undefined}
    >
      <p id="profile-occupation-legend" className={LABEL}>
        {t('legend')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OCCUPATIONS.map((option) => (
          <label key={option} className="group relative cursor-pointer">
            <input
              type="radio"
              name="occupation"
              value={option}
              data-kind={isStudent(option) ? 'student' : 'other'}
              defaultChecked={value === option}
              className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
            />
            <span className="inline-flex items-center rounded-full border border-white/25 px-4 py-2.5 text-base font-semibold break-keep text-white transition-[background-color,color,border-color,transform] duration-150 ease-out not-peer-checked:group-hover:bg-white/10 group-active:scale-[0.97] peer-checked:border-white peer-checked:bg-white peer-checked:text-stage peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-lime motion-reduce:transition-none">
              {t(option)}
            </span>
          </label>
        ))}
      </div>
      {message ? (
        <p id="profile-occupation-message" className={MESSAGE}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

// A checkbox row. The box is drawn for the dark stage (the native one disappears on it): lime when
// ticked, with an authored check mark. The text beside it is the label; `link` follows it outside
// the label, so the box's name stays the sentence.
function Consent({
  name,
  checked,
  message,
  label,
  link,
}: {
  name: string;
  checked: boolean;
  message?: string;
  label: string;
  link?: ReactNode;
}) {
  const id = `profile-${name}`;
  return (
    <div className="border-t border-white/15 py-4">
      <div className="flex items-start gap-3">
        <span className="relative inline-grid size-6 shrink-0 place-items-center">
          <input
            id={id}
            name={name}
            type="checkbox"
            defaultChecked={checked}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            className="peer size-6 cursor-pointer appearance-none rounded-sm border border-white/50 bg-white/5 checked:border-lime checked:bg-lime aria-invalid:border-white"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="pointer-events-none absolute size-4 text-cobalt opacity-0 peer-checked:opacity-100"
          >
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-base leading-6 break-keep text-white/85">
          <label htmlFor={id} className="cursor-pointer">
            {label}
          </label>
          {link ? <> {link}</> : null}
        </p>
      </div>
      {message ? (
        <p id={`${id}-message`} className={cn(MESSAGE, 'pl-9')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

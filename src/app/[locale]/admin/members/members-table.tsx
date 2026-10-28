'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import type { MemberFailure, MemberState } from '@/lib/auth/members';
import { cn } from '@/lib/utils';
import { submitMemberAction } from './actions';
import { Tick } from './tick';

// One person, with everything the table shows already put into words by the page.
export type MemberRowView = {
  id: string;
  // Empty until the person has finished signing up.
  name: string;
  email: string;
  occupation: string;
  detail: string;
  optIn: boolean;
  roleLabel: string;
  blocked: boolean;
  // Whether this viewer has any button that could change this person. A row with none is shown,
  // but cannot be ticked.
  selectable: boolean;
};

const NONE: ReadonlySet<string> = new Set();

function useCurrentLocale(): Locale {
  const locale = useLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

// The page's scripts are what make "select everyone" work, so the box is only there once they are.
const subscribeToNothing = () => () => {};

const PILL =
  'inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-base font-semibold break-keep transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none';
// The one lime pill on the screen is the main thing the screen is for: making people members.
const MAIN = `${PILL} bg-lime text-cobalt hover:-translate-y-0.5`;
const PLAIN = `${PILL} border border-white/50 text-white hover:bg-white/10`;

const CHIP = 'inline-flex rounded-full border px-3 py-0.5 text-sm font-semibold break-keep';

// The table of members with the buttons under it. Phones get each person as a stacked row (the
// table itself keeps its meaning for a screen reader through explicit roles); from `lg` up it is a
// table with hairline rows.
//
// It is one plain form: the ticked rows are `id` fields, the button pressed is `to=<role>` or
// `blocked=<true|false>`, and the server action does the rest, so everything works before the
// page's scripts have loaded.
export function MembersTable({ rows, admin }: { rows: MemberRowView[]; admin: boolean }) {
  const t = useTranslations('Admin.members');
  const locale = useCurrentLocale();
  const [state, formAction, pending] = useActionState<MemberState, FormData>(
    submitMemberAction,
    null,
  );
  const scripts = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  // Who is ticked. After an answer the choice follows it: a refused batch stays ticked, so the
  // person can see who was meant and change their mind; one that went through is done with. What
  // was ticked by hand since is kept per answer.
  const [picked, setPicked] = useState<{ for: MemberState; ids: ReadonlySet<string> }>({
    for: null,
    ids: NONE,
  });
  const selected: ReadonlySet<string> =
    picked.for === state ? picked.ids : state && !state.ok ? new Set(state.ids) : NONE;

  const selectable = rows.filter((row) => row.selectable).map((row) => row.id);
  const allTicked = selectable.length > 0 && selectable.every((id) => selected.has(id));
  const someTicked = selectable.some((id) => selected.has(id));

  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someTicked && !allTicked;
  }, [someTicked, allTicked, scripts]);

  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setPicked({ for: state, ids: next });
  }

  function toggleAll() {
    setPicked({ for: state, ids: allTicked ? NONE : new Set(selectable) });
  }

  // With scripts, the form is sent from here instead of by React's own form handling. React resets
  // a form once its action has finished, which would clear the ticks while the page still counts
  // them, and a refused batch has to stay ticked. Without scripts the form's action still posts
  // it, and the answer comes back with the page.
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  }

  return (
    <form
      action={formAction}
      onSubmit={send}
      data-members-form
      aria-busy={pending}
      className="mt-8"
    >
      {/* The language rides along as a field, not as an argument bound to the action: React cannot
          show a form again after a refusal (the plain-post path) when the action has bound
          arguments, and renders it forever. The action vets it as it would anything else the
          browser sends. */}
      <input type="hidden" name="locale" value={locale} />

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1 pb-3">
        {scripts && selectable.length > 0 ? (
          <label className="flex cursor-pointer items-center gap-3 py-2 text-base text-white/85">
            <Tick
              ref={allRef}
              checked={allTicked}
              onChange={toggleAll}
              aria-label={t('select.all')}
            />
            <span aria-hidden="true">{t('select.all')}</span>
          </label>
        ) : (
          <span />
        )}
        <p className="text-base text-white/75">{t('select.count', { count: selected.size })}</p>
      </div>

      <table
        role="table"
        aria-label={t('table.label')}
        className="block w-full text-left lg:table lg:table-fixed lg:border-collapse"
      >
        <thead role="rowgroup" className="sr-only lg:not-sr-only lg:table-header-group">
          <tr role="row">
            <th role="columnheader" scope="col" className="lg:w-14">
              <span className="sr-only">{t('select.header')}</span>
            </th>
            <Head className="lg:w-[11%]">{t('table.columns.name')}</Head>
            <Head className="lg:w-[27%]">{t('table.columns.email')}</Head>
            <Head className="lg:w-[12%]">{t('table.columns.occupation')}</Head>
            <Head className="lg:w-[20%]">{t('table.columns.detail')}</Head>
            <Head className="lg:w-[9%]">{t('table.columns.optIn')}</Head>
            <Head className="lg:w-[14%]">{t('table.columns.role')}</Head>
          </tr>
        </thead>
        <tbody role="rowgroup" className="block lg:table-row-group">
          {rows.map((row) => {
            const label = row.name || row.email;
            return (
              <tr
                key={row.id}
                role="row"
                className={cn(
                  'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-2 border-t border-white/15 py-3 lg:table-row lg:py-0',
                  selected.has(row.id) && 'bg-white/[0.06]',
                )}
              >
                <td
                  role="cell"
                  className="col-start-1 row-span-5 row-start-1 lg:table-cell lg:align-top"
                >
                  <label className="grid size-11 cursor-pointer place-items-center has-disabled:cursor-not-allowed">
                    <Tick
                      name="id"
                      value={row.id}
                      checked={selected.has(row.id)}
                      onChange={(event) => toggle(row.id, event.target.checked)}
                      disabled={!row.selectable}
                      aria-label={t('select.row', { name: label })}
                    />
                  </label>
                </td>
                <td
                  role="cell"
                  data-col="name"
                  className="col-start-2 row-start-1 min-w-0 pt-2 lg:table-cell lg:px-3 lg:py-4"
                >
                  {row.name ? (
                    <span className="text-lg font-semibold wrap-anywhere break-keep text-white lg:text-base">
                      {row.name}
                    </span>
                  ) : (
                    <span className="text-base break-keep text-white/60">
                      {t('table.unfinished')}
                    </span>
                  )}
                </td>
                <td
                  role="cell"
                  data-col="email"
                  className="col-span-2 col-start-2 row-start-2 min-w-0 text-base break-all text-white/75 lg:table-cell lg:px-3 lg:py-4"
                >
                  {row.email}
                </td>
                <Cell col="occupation" value={row.occupation} className="row-start-3" />
                <Cell col="detail" value={row.detail} className="row-start-4" />
                <td
                  role="cell"
                  data-col="optin"
                  className="col-span-2 col-start-2 row-start-5 text-sm text-white/65 lg:table-cell lg:px-3 lg:py-4 lg:text-base lg:text-white/75"
                >
                  {/* On a phone the value needs its name; a screen reader gets the column header. */}
                  <span aria-hidden="true" className="text-white/60 lg:hidden">
                    {t('table.columns.optIn')}{' '}
                  </span>
                  <span data-value>{row.optIn ? t('table.optInYes') : t('table.optInNo')}</span>
                </td>
                <td
                  role="cell"
                  data-col="role"
                  className="col-start-3 row-start-1 justify-self-end pt-2 lg:table-cell lg:px-3 lg:py-4"
                >
                  <span className="flex flex-wrap justify-end gap-1.5 lg:justify-start">
                    <span className={cn(CHIP, 'border-white/25')}>{row.roleLabel}</span>
                    {row.blocked ? (
                      <span className={cn(CHIP, 'border-white')}>{t('table.blocked')}</span>
                    ) : null}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-white/15 pt-5">
        <Answer state={state} pending={pending} />
        <div
          role="group"
          aria-label={t('actions.label')}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <button type="submit" name="to" value="member" disabled={pending} className={MAIN}>
            {t('actions.member')}
          </button>
          <button type="submit" name="to" value="guest" disabled={pending} className={PLAIN}>
            {t('actions.guest')}
          </button>
          {admin ? (
            <>
              <button type="submit" name="to" value="operator" disabled={pending} className={PLAIN}>
                {t('actions.operator')}
              </button>
              <button type="submit" name="to" value="admin" disabled={pending} className={PLAIN}>
                {t('actions.admin')}
              </button>
            </>
          ) : null}
          {/* Blocking is the one thing here that shuts a person out. It is a plain outline pill
              like the rest, set apart from the role buttons rather than made to look like the
              main action. */}
          <span className="flex flex-wrap gap-3 lg:ml-auto">
            <button type="submit" name="blocked" value="true" disabled={pending} className={PLAIN}>
              {t('actions.block')}
            </button>
            <button type="submit" name="blocked" value="false" disabled={pending} className={PLAIN}>
              {t('actions.unblock')}
            </button>
          </span>
        </div>
      </div>
    </form>
  );
}

function Head({ className, children }: { className?: string; children: string }) {
  return (
    <th
      role="columnheader"
      scope="col"
      className={cn('px-3 py-3 text-sm font-medium break-keep text-white/60', className)}
    >
      {children}
    </th>
  );
}

// A column that is empty for some people: nothing on a phone, a dash with a name for a screen
// reader on a wide screen.
function Cell({ col, value, className }: { col: string; value: string; className: string }) {
  const t = useTranslations('Admin.members.table');
  return (
    <td
      role="cell"
      data-col={col}
      className={cn(
        'col-span-2 col-start-2 min-w-0 text-base wrap-anywhere text-white/75 lg:table-cell lg:px-3 lg:py-4',
        !value && 'max-lg:hidden',
        className,
      )}
    >
      {value || (
        <>
          <span aria-hidden="true">–</span>
          <span className="sr-only">{t('none')}</span>
        </>
      )}
    </td>
  );
}

// What the last press did. A change that went through is a status, said politely; a refusal is an
// alert, said at once, with the people it names. The status region is always there, so a screen
// reader hears what is put into it; the alert is new each time (the key), so the same refusal is
// read out again when it is repeated.
function Answer({ state, pending }: { state: MemberState; pending: boolean }) {
  const t = useTranslations('Admin.members');
  const failed = state && !state.ok ? state : null;

  let done: string | null = null;
  if (state?.ok) {
    const { change } = state;
    const key = change.kind === 'role' ? change.to : change.blocked ? 'block' : 'unblock';
    done = t(`result.done.${key}`, { count: state.count });
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-h-6 text-base text-white"
      >
        {pending ? (
          <p className="text-white/75">{t('actions.pending')}</p>
        ) : done ? (
          <p key={state?.at} className="text-pretty break-keep">
            {done}
          </p>
        ) : null}
      </div>
      {failed && !pending ? (
        <p
          key={failed.at}
          role="alert"
          className="mt-2 text-base text-pretty break-keep text-white"
        >
          {refusal(t, failed)}
        </p>
      ) : null}
    </>
  );
}

function refusal(t: ReturnType<typeof useTranslations>, failure: MemberFailure) {
  if (failure.error === 'refused') {
    const { change } = failure;
    const key =
      change?.kind === 'block'
        ? change.blocked
          ? 'refusedBlock'
          : 'refusedUnblock'
        : 'refusedRole';
    const more = failure.more > 0 ? ` ${t('result.more', { count: failure.more })}` : '';
    return t(`result.errors.${key}`, { names: failure.names.join(', ') + more });
  }
  return t(`result.errors.${failure.error}`);
}

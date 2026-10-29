'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import type { MemberChange, MemberFailure, MemberState } from '@/lib/auth/members';
import type { AppRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { submitMemberAction } from './actions';
import { Tick } from './tick';

// One person, with everything the table shows already put into words by the page.
export type MemberRowView = {
  id: string;
  // The list holds finished sign-ups only, and every one of them has a name.
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
  'inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-base font-semibold break-keep transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 max-lg:px-4 motion-reduce:transition-none';
// The one lime pill in the page body is the main thing the screen is for: making people members.
const MAIN = `${PILL} bg-lime text-cobalt hover:-translate-y-0.5`;
const PLAIN = `${PILL} border border-white/50 text-white hover:bg-white/10`;
// A text button: the question's "no". Its touch target is 44px tall, however small the words.
const TEXT =
  'inline-flex min-h-11 items-center px-3 text-base text-white underline underline-offset-4';

// The buttons and the answer under the list, below `lg`: once somebody is ticked (or the last press
// has an answer to show) they stay at the bottom of the screen, so the buttons are within reach
// from the top of a long list. The same float as the header's account panel: 90% stage black, a
// hairline above, the page blurred behind. It reaches across the page's side padding, which is 20px
// (40px from md up), and lies below the last row when the page is scrolled to its end, because it
// sticks only while its own form is still on the screen. A tall answer scrolls inside it rather
// than taking the screen.
const BAR_BLEED = 'max-lg:-mx-5 max-lg:px-5 md:max-lg:-mx-10 md:max-lg:px-10';
const BAR_STUCK =
  'max-lg:sticky max-lg:bottom-0 max-lg:z-20 max-lg:max-h-[70svh] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:bg-stage/90 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:backdrop-blur-md';

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
  const count = selected.size;

  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someTicked && !allTicked;
  }, [someTicked, allTicked, scripts]);

  // A change that asks "are you sure?" comes back from the server as a question (see
  // submitMemberAction), so it is asked the same way with scripts and without. The question is
  // about the people who were ticked when it came: ticking or unticking anybody takes it back, and
  // so does "no". (Both are a choice made since the answer, see `picked`.)
  const asked = state && !state.ok && state.error === 'confirm' ? state : null;
  const asking = asked !== null && picked.for !== state;
  const askKey = asked ? changeKey(asked.change) : null;
  const questionId = useId();

  // Where the focus goes. With the question open it is on the answer that does the thing; when the
  // question closes (answered, cancelled, or taken back by a tick) the button that asked is where
  // the person was, so the focus returns there. If that button is dimmed by now (the change went
  // through and nobody is ticked any more) it goes to "select everyone", the start of the next go.
  // A person who has moved on in the meantime, to a tick for example, is left where they are.
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const asker = useRef<string | null>(null);
  useEffect(() => {
    if (asking) {
      asker.current = askKey;
      confirmRef.current?.focus();
      return;
    }
    const key = asker.current;
    asker.current = null;
    if (key === null && !state?.ok) return;
    const active = document.activeElement;
    const lost =
      !active ||
      active === document.body ||
      (active instanceof HTMLButtonElement && active.disabled);
    if (!lost) return;
    const [name, value] = key ? key.split('=') : [];
    const target = name
      ? formRef.current?.querySelector<HTMLButtonElement>(
          `button[name="${name}"][value="${value}"]`,
        )
      : null;
    (target && !target.disabled ? target : allRef.current)?.focus();
  }, [asking, askKey, state]);

  function cancel() {
    // Keeps who is ticked, drops the question.
    setPicked({ for: state, ids: selected });
  }

  function onQuestionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    cancel();
  }

  // With scripts, the buttons wait until somebody is ticked (a plain form post cannot know who is
  // ticked, so without scripts they are always there, and the server says "choose first").
  const idle = scripts && count === 0;
  // Below `lg` the bar sticks to the bottom of the screen while somebody is ticked, and after a
  // change that went through, so its answer is not left at the foot of a long list.
  const stuck = count > 0 || state?.ok === true;

  // A button's name says how many it is for once somebody is ticked.
  const actionLabel = (name: 'member' | 'guest' | 'operator' | 'admin' | 'block' | 'unblock') =>
    count > 0 ? t(`actions.counted.${name}`, { count }) : t(`actions.${name}`);

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
      ref={formRef}
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
                      aria-label={t('select.row', { name: row.name })}
                    />
                  </label>
                </td>
                <td
                  role="cell"
                  data-col="name"
                  className="col-start-2 row-start-1 min-w-0 pt-2 lg:table-cell lg:px-3 lg:py-4"
                >
                  <span className="text-lg font-semibold wrap-anywhere break-keep text-white lg:text-base">
                    {row.name}
                  </span>
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

      <div
        data-action-bar
        data-stuck={stuck || undefined}
        className={cn('border-t border-white/15 pt-5', BAR_BLEED, stuck && BAR_STUCK)}
      >
        {stuck && count > 0 ? (
          <p className="mb-2 text-base text-white/75 lg:hidden">{t('select.count', { count })}</p>
        ) : null}
        <Answer state={state} pending={pending} />
        {asked && asking ? (
          <div
            role="group"
            aria-labelledby={questionId}
            // What the change costs, when it takes staff roles away, is the question's description.
            aria-describedby={
              asked.staff
                ? asked.staff.self
                  ? `${questionId}-staff ${questionId}-self`
                  : `${questionId}-staff`
                : undefined
            }
            onKeyDown={onQuestionKeyDown}
            className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 lg:mt-4"
          >
            {/* The second yes: the form goes to the server again with this, and the server does
                the change only because of it. */}
            <input type="hidden" name="confirm" value="1" />
            <div className="min-w-0">
              <p
                id={questionId}
                className="text-lg font-semibold text-pretty break-keep text-white"
              >
                {t(`confirm.${askName(asked.change)}.question`, { count })}
              </p>
              {asked.staff ? (
                <>
                  <p
                    id={`${questionId}-staff`}
                    className="mt-1 text-base text-pretty break-keep text-white/85"
                  >
                    {t('confirm.staffLoss', { staff: asked.staff.count })}
                  </p>
                  {asked.staff.self ? (
                    <p
                      id={`${questionId}-self`}
                      className="mt-1 text-base text-pretty break-keep text-white/85"
                    >
                      {t('confirm.selfLoss')}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                ref={confirmRef}
                type="submit"
                name={asked.change.kind === 'role' ? 'to' : 'blocked'}
                value={
                  asked.change.kind === 'role' ? asked.change.to : String(asked.change.blocked)
                }
                disabled={pending}
                className={PLAIN}
              >
                {t(`confirm.${askName(asked.change)}.yes`)}
              </button>
              {/* With scripts this only takes the question back. Without them it is a form
                  post, and the server answers it by showing the form as it was. */}
              <button
                type="submit"
                name="cancel"
                value="1"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  cancel();
                }}
                className={TEXT}
              >
                {t('confirm.cancel')}
              </button>
            </span>
          </div>
        ) : (
          <div
            role="group"
            aria-label={t('actions.label')}
            className={cn(
              'mt-3 flex flex-wrap items-center gap-3 lg:mt-4',
              idle && stuck && 'max-lg:hidden',
            )}
          >
            <button
              type="submit"
              name="to"
              value="member"
              disabled={pending || idle}
              className={MAIN}
            >
              {actionLabel('member')}
            </button>
            <button
              type="submit"
              name="to"
              value="guest"
              disabled={pending || idle}
              className={PLAIN}
            >
              {actionLabel('guest')}
            </button>
            {admin ? (
              <>
                <button
                  type="submit"
                  name="to"
                  value="operator"
                  disabled={pending || idle}
                  className={PLAIN}
                >
                  {actionLabel('operator')}
                </button>
                <button
                  type="submit"
                  name="to"
                  value="admin"
                  disabled={pending || idle}
                  className={PLAIN}
                >
                  {actionLabel('admin')}
                </button>
              </>
            ) : null}
            {/* Blocking is the one thing here that shuts a person out. It is a plain outline pill
                like the rest, set apart from the role buttons rather than made to look like the
                main action. */}
            <span className="flex flex-wrap gap-3 lg:ml-auto">
              <button
                type="submit"
                name="blocked"
                value="true"
                disabled={pending || idle}
                className={PLAIN}
              >
                {actionLabel('block')}
              </button>
              <button
                type="submit"
                name="blocked"
                value="false"
                disabled={pending || idle}
                className={PLAIN}
              >
                {actionLabel('unblock')}
              </button>
            </span>
          </div>
        )}
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

// The name a button of the form goes by: the field it sends.
function changeKey(change: MemberChange): string {
  return change.kind === 'role' ? `to=${change.to}` : `blocked=${change.blocked}`;
}

// Which question a change asks (only the changes of needsConfirmation ever do: blocking, and a
// role change, which for member or guest asks only when staff would lose their role).
function askName(change: MemberChange): 'block' | AppRole {
  return change.kind === 'block' ? 'block' : change.to;
}

// What the last press did. A change that went through is a status, said politely; a refusal is an
// alert, said at once, with the people it names and what to do about each. The status region is
// always there, so a screen reader hears what is put into it; the alert is new each time (the
// key), so the same refusal is read out again when it is repeated. A question is neither: it is
// the buttons' own place.
function Answer({ state, pending }: { state: MemberState; pending: boolean }) {
  const t = useTranslations('Admin.members');
  const failed = state && !state.ok && state.error !== 'confirm' ? state : null;

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
        className="min-h-6 text-base text-white max-lg:min-h-0"
      >
        {pending ? (
          <p className="text-white/75">{t('actions.pending')}</p>
        ) : done ? (
          <p key={state?.at} className="text-pretty break-keep">
            {done}
          </p>
        ) : null}
      </div>
      {failed && !pending ? <Refusal key={failed.at} failure={failed} /> : null}
    </>
  );
}

// A refusal in words. When people in the batch cannot be changed, the answer first says that
// nothing was done (the whole batch is refused), then gives one sentence for each reason: who, why,
// and what to do about it. Anything else is the one sentence for it.
function Refusal({ failure }: { failure: MemberFailure }) {
  const t = useTranslations('Admin.members');
  const roles = useTranslations('Auth.me.roles');
  const { change } = failure;

  let sentences: string[] = [];
  if (failure.error === 'refused') {
    const lead =
      change?.kind === 'block'
        ? change.blocked
          ? 'refusedBlock'
          : 'refusedUnblock'
        : 'refusedRole';
    sentences = [
      t(`result.errors.${lead}`),
      ...failure.groups.map((group) => {
        const who = t('result.who', { names: group.names.join(', '), more: group.more });
        switch (group.reason) {
          case 'same':
            return t('result.reasons.same', {
              who,
              count: group.names.length + group.more,
              role: change?.kind === 'role' ? roles(change.to) : '',
            });
          case 'self':
            return t('result.reasons.self', { who });
          case 'authority':
            return t(
              change?.kind === 'block'
                ? change.blocked
                  ? 'result.reasons.authorityBlock'
                  : 'result.reasons.authorityUnblock'
                : 'result.reasons.authorityRole',
              { who },
            );
        }
      }),
    ];
  } else {
    sentences = [t(`result.errors.${failure.error}`)];
  }

  return (
    <div role="alert" className="mt-2 space-y-1 text-base text-pretty break-keep text-white">
      {sentences.map((sentence, index) => (
        <p key={index}>{sentence}</p>
      ))}
    </div>
  );
}

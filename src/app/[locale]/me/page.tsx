import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { displayName, initial } from '@/lib/auth/name';
import { profileValues } from '@/lib/auth/profile-values';
import { isStudent } from '@/lib/auth/occupation';
import { requireViewer } from '@/lib/auth/viewer';
import { AccountLayout, accountMetadata } from '../account-layout';
import { ProfileForm } from '../welcome/profile-form';
import { DeleteAccount } from './delete-account';
import { ScreenTitle } from './screen-title';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Auth.me' });
  return accountMetadata(t('metaTitle'));
}

// A query value that is one string. Repeated parameters (`?edit=1&edit=2`) arrive as a list and
// count as absent: nobody has a reason to send two.
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const TITLE =
  'font-display text-[clamp(3.25rem,9vw,6rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance break-keep';

// My page: what the account has told us, with the ways to change it, to leave it, and to delete
// it. Editing is the same page with `?edit=1` (a link, so it works without JavaScript and the
// browser's back button leaves it); the delete step is folded into the view.
export default async function MyPage({ params, searchParams }: Props) {
  // With accounts switched off there is no My page, exactly as before it existed.
  if (!isAuthEnabled()) notFound();

  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;

  // Signed out goes to sign-in, an unfinished sign-up to the form, a blocked account to the
  // reason; each of them brings the visitor back here.
  const viewer = await requireViewer(locale, `/${locale}/me`);
  const t = await getTranslations('Auth.me');

  if (single(query.edit) === '1') {
    return (
      <AccountLayout>
        <div className="w-full max-w-lg">
          <ScreenTitle screen="edit" className={TITLE}>
            {t('editTitle')}
          </ScreenTitle>
          <ProfileForm
            mode="edit"
            email={viewer.email}
            next={`/${locale}/me`}
            initial={profileValues(viewer.profile)}
          />
          <p className="mt-6 text-center">
            <Link
              href="/me"
              prefetch={false}
              className="inline-flex min-h-11 items-center px-3 text-base text-white underline underline-offset-4"
            >
              {t('cancel')}
            </Link>
          </p>
        </div>
      </AccountLayout>
    );
  }

  const profile = viewer.profile;
  const name = displayName(profile, locale) || viewer.email;
  const occupation = await getTranslations('Auth.profile');
  const menu = await getTranslations('Auth.menu');
  const student = profile.occupation !== null && isStudent(profile.occupation);

  // Label above, value below, like the ruled lists on the rest of the site. A row with nothing in
  // it is left out.
  const rows: { label: string; value: string }[] = [];
  if (profile.occupation) {
    rows.push({
      label: occupation('occupation.legend'),
      value: occupation(`occupation.${profile.occupation}`),
    });
  }
  if (student && profile.school) rows.push({ label: occupation('school'), value: profile.school });
  if (student && profile.major) rows.push({ label: occupation('major'), value: profile.major });
  if (!student && profile.affiliation) {
    rows.push({ label: t('rows.affiliation'), value: profile.affiliation });
  }
  rows.push({
    label: t('rows.recruit'),
    value: t(profile.recruit_opt_in ? 'rows.recruitOn' : 'rows.recruitOff'),
  });

  return (
    <AccountLayout>
      <div className="w-full max-w-lg">
        <ScreenTitle screen="view" className={TITLE}>
          {t('title')}
        </ScreenTitle>

        <div className="mt-10 flex items-center gap-4">
          {/* The letter is decoration next to the name. */}
          <span
            data-profile-initial
            aria-hidden
            className="inline-flex size-16 shrink-0 items-center justify-center rounded-full border border-white/50 font-display text-3xl font-[800]"
          >
            {initial(profile) || (Array.from(viewer.email)[0] ?? '').toLocaleUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-display text-2xl leading-tight font-[850] wrap-anywhere break-keep">
              {name}
            </p>
            <p className="mt-1 text-base break-all text-white/75">{viewer.email}</p>
            <p className="mt-3">
              <span className="inline-flex rounded-full border border-white/25 px-3.5 py-1 text-sm font-semibold break-keep">
                {t(`roles.${viewer.role}`)}
              </span>
            </p>
          </div>
        </div>

        <dl className="mt-8">
          {rows.map((row) => (
            <div key={row.label} className="border-t border-white/15 py-4">
              <dt className="text-sm font-medium text-white/60">{row.label}</dt>
              <dd className="mt-1 text-lg font-semibold wrap-anywhere break-keep text-white">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-white/15 pt-6">
          <Link
            href={{ pathname: '/me', query: { edit: '1' } }}
            prefetch={false}
            className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3 font-semibold text-cobalt transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
          >
            {t('edit')}
          </Link>
          {/* A plain form, so signing out works before the page has finished loading. Only a POST
              signs anyone out. */}
          <form method="post" action={`/${locale}/auth/signout`} className="mt-4 text-center">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center px-3 text-base text-white underline underline-offset-4"
            >
              {menu('signOut')}
            </button>
          </form>
        </div>

        <DeleteAccount />
      </div>
    </AccountLayout>
  );
}

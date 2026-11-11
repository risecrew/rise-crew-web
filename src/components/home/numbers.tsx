/* eslint-disable @next/next/no-img-element */
import { getTranslations } from 'next-intl/server';
import { TextLink } from '@/components/site/text-link';
import type { Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { cn } from '@/lib/utils';

export type HomeNumber = { id: string; shown: React.ReactNode; label: string };

// S2 (wireframe v1.1, §8): four numbers, one date for all of them, and the partners' logos. The
// numbers are plain text, never counted up, so a screen reader reads each once.
export async function Numbers({
  locale,
  numbers,
  asOf,
  partners,
}: {
  locale: Locale;
  numbers: HomeNumber[];
  asOf: string;
  partners: Partner[];
}) {
  const t = await getTranslations('Home.numbers');
  // Only partners with an approved logo file go on the band; names alone are for the network page.
  const logos = partners.filter((p) => p.logo && p.logoApproved).slice(0, 12);

  return (
    // The numbers stand under the cobalt stage light, so they read as their own moment after the
    // opening photo rather than as more text on black.
    <section
      aria-labelledby="numbers-title"
      className="relative isolate overflow-hidden section-y text-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_60%_at_50%_45%,rgb(0_62_145/0.7),transparent_75%)]"
      />
      <div className="shell">
        <h2 id="numbers-title" className="sr-only">
          {t('title')}
        </h2>
        <dl className="grid grid-cols-2 gap-y-10 border-y border-white/15 py-10 md:grid-cols-4 md:py-12">
          {numbers.map((n, index) => (
            <div
              key={n.id}
              className={cn(
                // Each number sits in the middle of its own column, with a thin line between
                // neighbours: every second one on a phone, all but the first from a tablet up.
                'flex flex-col items-center text-center',
                index % 2 === 1 && 'border-l border-white/15',
                index > 0 && 'md:border-l md:border-white/15',
              )}
            >
              <dt className="order-2 mt-2 text-[15px] text-white/80">{n.label}</dt>
              <dd className="order-1 font-display text-numeral">{n.shown}</dd>
            </div>
          ))}
        </dl>
        {logos.length > 0 ? (
          <ul className="section-gap grid grid-cols-3 gap-6 md:grid-cols-6">
            {logos.map((p) => (
              <li key={p.id} className="flex h-16 items-center justify-center">
                <img
                  src={p.logo}
                  alt={pick(p.name, locale)}
                  className="h-10 w-auto opacity-80 grayscale transition-[filter,opacity] duration-200 hover:opacity-100 hover:grayscale-0"
                />
              </li>
            ))}
          </ul>
        ) : null}
        {/* The way to every partner on the left, the date the numbers hold for on the right. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <TextLink href={{ pathname: '/network', hash: 'partners' }}>
            {t('allPartners', { count: partners.length })}
          </TextLink>
          <p className="text-sm text-white/64">{asOf}</p>
        </div>
      </div>
    </section>
  );
}

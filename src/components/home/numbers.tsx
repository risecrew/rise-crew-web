/* eslint-disable @next/next/no-img-element */
import { getTranslations } from 'next-intl/server';
import { TextLink } from '@/components/site/text-link';
import type { Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';

export type HomeNumber = { id: string; value: string; unit: string; label: string };

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
    <section aria-labelledby="numbers-title" className="section-y text-white">
      <div className="shell">
        <h2 id="numbers-title" className="sr-only">
          {t('title')}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.id} className="flex flex-col">
              <dt className="order-2 mt-2 text-[15px] text-white/80">{n.label}</dt>
              <dd className="order-1 font-display text-numeral">
                {n.value}
                <span className="ml-1 text-xl font-semibold">{n.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm text-white/64">{asOf}</p>
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
        <div className="mt-8">
          <TextLink href={{ pathname: '/network', hash: 'partners' }}>
            {t('allPartners', { count: partners.length })}
          </TextLink>
        </div>
      </div>
    </section>
  );
}

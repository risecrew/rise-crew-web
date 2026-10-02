/* eslint-disable @next/next/no-img-element */
import type { Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';

export function PartnerMark({ partner, locale }: { partner: Partner; locale: Locale }) {
  const name = pick(partner.name, locale);
  const mark =
    partner.logo && partner.logoApproved ? (
      <img src={partner.logo} alt={name} className="h-8 w-auto" />
    ) : (
      <span className="text-cobalt font-semibold break-keep">{name}</span>
    );
  return partner.url ? (
    <a
      href={partner.url}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-4 hover:underline"
    >
      {mark}
    </a>
  ) : (
    mark
  );
}

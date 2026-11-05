import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { TeamCard as Team } from '@/lib/teams/queries';
import { TeamMark } from './team-mark';

// One team in the list: a ruled row, the way the mentors are listed, not a card.
export function TeamCard({ team, logo }: { team: Team; logo: string | null }) {
  const t = useTranslations('Teams');
  return (
    <li className="border-t border-white/15">
      <Link
        href={`/startups/${team.slug}`}
        className="group flex items-start gap-4 py-5 transition-colors duration-150 hover:bg-white/5"
      >
        <TeamMark name={team.name} url={logo} className="size-14 text-2xl" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl font-[850] wrap-anywhere break-keep underline-offset-4 group-hover:underline">
            {team.name}
          </span>
          {team.tagline ? (
            <span className="mt-1 block wrap-anywhere break-keep text-white/75">
              {team.tagline}
            </span>
          ) : null}
          <span className="mt-2 block text-sm font-medium text-white/60">
            {t(`fields.${team.field}`)} · {t('cohort', { cohort: team.cohort })}
          </span>
        </span>
        {team.cover ? (
          <Image
            src={team.cover}
            alt=""
            width={320}
            height={240}
            unoptimized
            loading="lazy"
            className="aspect-[4/3] w-20 shrink-0 rounded-lg object-cover sm:w-32"
          />
        ) : null}
      </Link>
    </li>
  );
}

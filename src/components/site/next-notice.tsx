import { getTranslations } from 'next-intl/server';
import { Bullet } from '@/components/site/bullet';
import type { NextNotice as Notice } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';

const INSTAGRAM = /@([a-z0-9._]+)/i;

// When the next intake opens, where it will be announced, and a closing line, each on its own
// line rather than one long sentence. An Instagram handle links to the account.
export async function NextNotice({ notice, locale }: { notice: Notice; locale: Locale }) {
  const t = await getTranslations('NextNotice');
  return (
    <div className="break-keep">
      <p className="text-lg font-semibold text-white">{pick(notice.when, locale)}</p>
      <p className="mt-4 text-sm font-semibold text-white/64">{t('via')}</p>
      <ul className="mt-2 grid gap-1.5 text-base text-white/80">
        {notice.channels.map((channel) => {
          const text = pick(channel, locale);
          const handle = INSTAGRAM.exec(text)?.[1];
          return (
            <li key={channel.en} className="flex gap-2.5">
              <Bullet />
              {handle ? (
                <a
                  href={`https://www.instagram.com/${handle}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-white/40 hover:decoration-white"
                >
                  {text}
                </a>
              ) : (
                text
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-base text-white/80">{pick(notice.closing, locale)}</p>
    </div>
  );
}

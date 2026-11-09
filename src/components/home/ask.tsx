import { getTranslations } from 'next-intl/server';
import { AskButton } from '@/components/stage/ask-button';
import type { ApplyCta } from '@/lib/content';

const EMAIL = 'risecrew4@gmail.com';

export async function Ask({ cta }: { cta: ApplyCta }) {
  const t = await getTranslations('Home');
  const contact = await getTranslations('Contact');
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(contact('subject'))}`;

  return (
    <section
      data-ask
      aria-labelledby="ask-title"
      className="px-5 pt-20 pb-28 text-white md:px-10 md:pt-28 md:pb-36"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <h2 id="ask-title" className="font-display text-headline text-balance break-keep">
          {t('ask.title')}
        </h2>
        <p className="mt-5 text-lg break-keep text-white/80">{t('ask.body')}</p>
        <div className="mt-8">
          <AskButton cta={cta} />
        </div>
      </div>
      {/* Partnerships close the page, under the recruitment ask; the footer below carries the
          address and the email itself. There is no contact page any more: old links land here. */}
      <div
        id="contact"
        className="mx-auto mt-20 flex max-w-7xl scroll-mt-24 flex-col items-center border-t border-white/10 pt-16 text-center md:mt-28 md:pt-20"
      >
        <h2 className="font-display text-subhead text-balance break-keep">{contact('title')}</h2>
        <p className="mt-4 text-lg break-keep text-white/80">{contact('lead')}</p>
        <a
          href={mail}
          className="mt-7 inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-white active:scale-[0.97]"
        >
          {contact('button')}
        </a>
      </div>
    </section>
  );
}

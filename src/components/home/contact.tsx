import { getTranslations } from 'next-intl/server';
import { SECONDARY } from '@/components/site/buttons';
import { CopyButton } from '@/components/site/copy-button';

export const EMAIL = 'risecrew4@gmail.com';
const KINDS = ['company', 'mentor', 'press'] as const;

// S7 (wireframe v1.1, §8): partnerships close the page. This is the one place the address is
// written out; the footer leads here. Old links to the contact page land on the home.
export async function Contact() {
  const t = await getTranslations('Home.contact');
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(t('subject'))}`;

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-[88px] section-y text-white"
    >
      <div className="shell">
        <h2 id="contact-title" className="font-display text-headline text-balance break-keep">
          {t('title')}
        </h2>
        <ul className="section-gap grid gap-8 md:grid-cols-3">
          {KINDS.map((kind) => (
            <li key={kind} className="border-t border-white/15 pt-5">
              <h3 className="font-display text-subhead break-keep">{t(`${kind}.title`)}</h3>
              <p className="mt-2 text-base break-keep text-white/80">{t(`${kind}.body`)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-subhead select-all">{EMAIL}</p>
          <div className="flex flex-wrap gap-3">
            <CopyButton text={EMAIL} label={t('copy')} done={t('copied')} />
            <a href={mail} className={SECONDARY}>
              {t('write')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

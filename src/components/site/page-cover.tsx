import type { ReactNode } from 'react';
import { Guilloche } from '@/components/passport/guilloche';

type Props = { title: string; lead?: string; children?: ReactNode };

export function PageCover({ title, lead, children }: Props) {
  return (
    <section className="bg-cobalt relative isolate overflow-hidden text-white">
      <Guilloche palette="white" className="absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl px-5 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24">
        <h1 className="font-display max-w-4xl text-[clamp(2.4rem,6vw,5rem)] leading-none font-[850] text-balance break-keep">
          {title}
        </h1>
        {lead ? <p className="mt-6 max-w-2xl text-lg break-keep text-white/85">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

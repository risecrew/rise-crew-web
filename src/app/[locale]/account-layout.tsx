import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The shell every account screen sits in (sign-in, sign-up, my page, members): the dark stage of
// the rest of the site with a cobalt light shining down from the top edge, the way the 404 page
// is lit from below. The screen's own content is centred in it.
export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-stage px-5 pt-32 pb-20 text-white md:px-10"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[80svh] bg-[radial-gradient(ellipse_75%_65%_at_50%_0%,rgb(0_62_145/0.6),transparent_70%)]"
      />
      {children}
    </main>
  );
}

// Account screens are for people who have signed up, so search engines leave them out whether or
// not the site has launched. The title takes the same " | RISE CREW" ending as the public pages.
export function accountMetadata(title: string): Metadata {
  return { title: `${title} | RISE CREW`, robots: { index: false, follow: false } };
}

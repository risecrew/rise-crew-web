'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Message({ text }: { text: string }) {
  // The address is read in the browser, so the home page itself stays static (see page.tsx).
  const deleted = useSearchParams().get('deleted') === '1';
  if (!deleted) return null;
  return (
    <div className="px-5 pt-24 pb-5 md:px-10 md:pt-28">
      <p className="mx-auto w-fit max-w-full rounded-lg border border-white/25 px-4 py-3 text-center text-base text-pretty break-keep text-white">
        {text}
      </p>
    </div>
  );
}

// The line the home page opens with after an account was deleted (`?deleted=1`), above the photo.
// The status region is in the page from the start and stays empty until the address says so, so
// that a screen reader announces the line when it appears.
export function DeletedNotice({ text }: { text: string }) {
  return (
    <div role="status">
      <Suspense fallback={null}>
        <Message text={text} />
      </Suspense>
    </div>
  );
}

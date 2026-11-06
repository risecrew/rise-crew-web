'use client';

import { useEffect, useRef } from 'react';
import { MESSAGE } from './form-parts';

// Why a picked file was refused, right under the file button. On a phone the bottom of a long form
// is out of sight, so the message sits here and comes on screen if it landed just below the fold.
export function FieldNotice({ text }: { text: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (text) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [text]);

  return (
    <div ref={ref} role="status" aria-live="polite">
      {text ? <p className={MESSAGE}>{text}</p> : null}
    </div>
  );
}

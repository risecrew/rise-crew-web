'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Copies a piece of text, and says so for two seconds. The text itself stays on the page as
// plain, selectable text, so nobody depends on this button or on a mail app.
export function CopyButton({
  text,
  label,
  done,
  className,
}: {
  text: string;
  label: string;
  done: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Without clipboard access the address is still there to select.
        }
      }}
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-white px-6 font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]',
        className,
      )}
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

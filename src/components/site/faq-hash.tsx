'use client';

import { useEffect } from 'react';

// Opens the question a link points at (`/join#faq-other-schools`), so a shared link lands on the
// answer, not on a closed list.
export function FaqHash() {
  useEffect(() => {
    const open = () => {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target instanceof HTMLDetailsElement) target.open = true;
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}

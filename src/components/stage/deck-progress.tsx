'use client';

import { useEffect, useState } from 'react';
import { slideCounter } from '@/lib/stage';
import { cn } from '@/lib/utils';

// The presenter's remote: current slide and a progress bar, pinned to the bottom of the
// stage while the deck is on screen.
export function DeckProgress({ total, label }: { total: number; label: string }) {
  const [current, setCurrent] = useState(1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    const deck = document.querySelector<HTMLElement>('[data-deck]');
    const onScroll = () => {
      const middle = window.innerHeight / 2;
      let active = 1;
      scenes.forEach((scene, i) => {
        if (scene.getBoundingClientRect().top <= middle) active = i + 1;
      });
      setCurrent(active);
      if (deck) setVisible(deck.getBoundingClientRect().bottom > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-white backdrop-blur-md">
        <span data-deck-counter className="font-mono text-xs">
          {slideCounter(current, total)}
        </span>
        <span aria-hidden className="h-1 w-24 overflow-hidden rounded-full bg-white/20">
          <span
            className="block h-full origin-left rounded-full bg-lime transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${current / total})` }}
          />
        </span>
      </div>
    </div>
  );
}

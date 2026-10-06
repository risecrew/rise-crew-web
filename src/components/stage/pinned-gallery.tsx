'use client';

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  galleryCaptionFrames,
  galleryCity,
  galleryLength,
  galleryPhotoRange,
  gallerySnapPoints,
} from '@/lib/stage';
import { cn } from '@/lib/utils';

export type GalleryItem = { id: string; label: string; photo: ReactNode; caption: ReactNode };

const STEP = 100; // svh of scroll per city
const noop = () => () => {};

// True only after hydration, so the server and no-JS render stay a plain list.
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

// Global: photo and caption pinned together. Each next city wipes up from the bottom early in
// its screen of scroll, then holds so it can be read; letting go settles on the nearest city.
// Without JavaScript, or with reduced motion, the cities are a plain vertical list.
export function PinnedGallery({ items }: { items: GalleryItem[] }) {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  return hydrated && !reduce ? <Pinned items={items} /> : <List items={items} />;
}

function List({ items }: { items: GalleryItem[] }) {
  return (
    <div data-gallery className="grid gap-16 md:gap-24">
      {items.map((item) => (
        <div
          key={item.id}
          className="grid items-center gap-6 md:grid-cols-[0.85fr_1.15fr] md:gap-14"
        >
          <div data-caption>{item.caption}</div>
          <div className="relative h-[46svh] overflow-hidden rounded-lg md:h-[64svh]">
            {item.photo}
          </div>
        </div>
      ))}
    </div>
  );
}

function Pinned({ items }: { items: GalleryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;
  const length = galleryLength(count);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const position = useTransform(scrollYProgress, (v) => v * length);
  const [active, setActive] = useState(0);
  useMotionValueEvent(position, 'change', (v) => setActive(galleryCity(v, count)));

  // Proximity snapping only acts where snap points exist: the cities below.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollSnapType;
    html.style.scrollSnapType = 'y proximity';
    return () => {
      html.style.scrollSnapType = previous;
    };
  }, []);

  return (
    <div
      ref={ref}
      data-gallery
      className="relative"
      style={{ height: `${(length + 1) * STEP}svh` }}
    >
      {gallerySnapPoints(count).map((point, i) => (
        <span
          key={items[i].id}
          data-gallery-stop
          aria-hidden
          className="absolute inset-x-0 h-px snap-start"
          style={{ top: `${point * STEP}svh` }}
        />
      ))}
      <div className="sticky top-0 flex h-svh flex-col gap-4 pt-16 pb-20 md:grid md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-14 md:py-0">
        <div className="order-2 flex flex-col md:order-1">
          <ol className="flex gap-4 text-sm font-semibold md:flex-col md:gap-2 md:text-base">
            {items.map((item, i) => (
              <li
                key={item.id}
                data-city
                aria-current={i === active ? 'step' : undefined}
                className={cn(
                  'transition-colors duration-300',
                  i === active ? 'text-white' : 'text-white/55',
                )}
              >
                {item.label}
              </li>
            ))}
          </ol>
          <div className="relative mt-5 min-h-[11rem] md:mt-10 md:min-h-[15rem]">
            {items.map((item, i) => (
              <Caption
                key={item.id}
                index={i}
                count={count}
                position={position}
                hidden={i !== active}
              >
                {item.caption}
              </Caption>
            ))}
          </div>
        </div>
        <div className="relative order-1 h-[42svh] w-full shrink-0 overflow-hidden rounded-lg md:order-2 md:h-[72svh]">
          {items.map((item, i) => (
            <Photo key={item.id} index={i} position={position} hidden={i !== active}>
              {item.photo}
            </Photo>
          ))}
        </div>
      </div>
    </div>
  );
}

function Caption({
  index,
  count,
  position,
  hidden,
  children,
}: {
  index: number;
  count: number;
  position: MotionValue<number>;
  hidden: boolean;
  children: ReactNode;
}) {
  const frames = galleryCaptionFrames(index, count);
  const opacity = useTransform(position, frames.input, frames.opacity);
  const y = useTransform(position, frames.input, frames.y);
  return (
    <motion.div
      data-caption
      aria-hidden={hidden}
      className="absolute inset-x-0 top-0"
      style={{ opacity, y }}
    >
      {children}
    </motion.div>
  );
}

function Photo({
  index,
  position,
  hidden,
  children,
}: {
  index: number;
  position: MotionValue<number>;
  hidden: boolean;
  children: ReactNode;
}) {
  const range = galleryPhotoRange(index);
  const clipPath = useTransform(position, range, ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)']);
  const scale = useTransform(position, range, [1.12, 1]);

  if (index === 0) {
    return (
      <div aria-hidden={hidden} className="absolute inset-0">
        {children}
      </div>
    );
  }
  return (
    <motion.div aria-hidden={hidden} className="absolute inset-0" style={{ clipPath }}>
      <motion.div className="absolute inset-0" style={{ scale }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

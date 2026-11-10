'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';

type Photo = { src: string; alt: string; external: boolean };

// An activity's photos (wireframe v1.1, §12 E5): a grid, and each opens large in a viewer that moves
// with the arrow buttons, the arrow keys or a swipe, says where it is ("3 / 24") and closes with
// Escape or its close button. The viewer is a modal dialog, so the page behind it waits.
export function Gallery({
  photos,
  caption,
  labels,
}: {
  photos: Photo[];
  caption: string;
  labels: { open: string; close: string; previous: string; next: string; viewer: string };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [index, setIndex] = useState(0);
  const touch = useRef<number | null>(null);
  const count = photos.length;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    dialog.addEventListener('keydown', onKey);
    return () => dialog.removeEventListener('keydown', onKey);
    // `go` only reads the count, which does not change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const photo = photos[index];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              aria-label={`${labels.open} ${i + 1} / ${count}`}
              onClick={(event) => {
                opener.current = event.currentTarget;
                setIndex(i);
                dialogRef.current?.showModal();
              }}
              className="relative block aspect-[3/2] w-full overflow-hidden rounded-xl bg-white/5"
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                unoptimized={p.external}
                sizes="(min-width: 808px) 190px, 50vw"
                className="object-cover transition-transform duration-200 ease-out hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={labels.viewer}
        onClose={() => opener.current?.focus()}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-stage/95 p-0 text-white backdrop:bg-stage/90"
      >
        <div
          className="flex h-full flex-col"
          onTouchStart={(event) => {
            touch.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touch.current;
            const end = event.changedTouches[0]?.clientX;
            touch.current = null;
            if (start === null || end === undefined || Math.abs(end - start) < 40) return;
            go(end < start ? 1 : -1);
          }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <p className="font-mono text-sm text-white/80" aria-live="polite">
              {index + 1} / {count}
            </p>
            <button
              type="button"
              aria-label={labels.close}
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-11 items-center justify-center text-2xl"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            {photo ? (
              <Image
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized={photo.external}
                sizes="100vw"
                className="object-contain"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 font-semibold"
            >
              {labels.previous}
            </button>
            <p className="min-w-0 flex-1 text-center text-sm break-keep text-white/64">{caption}</p>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 font-semibold"
            >
              {labels.next}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

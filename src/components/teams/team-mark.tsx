import Image from 'next/image';
import { cn } from '@/lib/utils';

// A team's logo on a small board, or the first letter of its name where it has none yet. Logos are
// served as they are (`unoptimized`), so nothing a team uploads passes through the image cache.
export function TeamMark({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/5 font-display font-[800] text-white',
        className,
      )}
    >
      {url ? (
        <Image src={url} alt="" fill unoptimized className="object-contain" />
      ) : (
        <span aria-hidden>{name.slice(0, 1)}</span>
      )}
    </span>
  );
}

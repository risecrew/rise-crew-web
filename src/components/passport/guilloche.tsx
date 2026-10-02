import type { Palette } from '@/lib/guilloche';
import { cn } from '@/lib/utils';

export function Guilloche({
  palette = 'blue',
  className,
}: {
  palette?: Palette;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none bg-cover bg-center bg-no-repeat', className)}
      style={{ backgroundImage: `url(/patterns/${palette}.svg)` }}
    />
  );
}

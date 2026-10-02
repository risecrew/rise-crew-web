import { GUILLOCHE_TILE, type Palette } from '@/lib/guilloche';
import { cn } from '@/lib/utils';

// Security-paper hairlines, repeated as a seamless tile so no band ever shows a cut edge.
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
      className={cn('pointer-events-none bg-repeat', className)}
      style={{
        backgroundImage: `url(/patterns/${palette}.svg)`,
        backgroundSize: `${GUILLOCHE_TILE.width}px ${GUILLOCHE_TILE.height}px`,
      }}
    />
  );
}

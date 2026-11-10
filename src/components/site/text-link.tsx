import type { ComponentProps } from 'react';
import { ArrowRightIcon } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// "See all →": a section's one link to more, at the right end of its title row (wireframe v1.1,
// §5.4).
export function TextLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:decoration-lime',
        className,
      )}
    >
      {children}
      <ArrowRightIcon />
    </Link>
  );
}

// A section title with its link, side by side from a tablet up.
export function SectionTitle({
  id,
  title,
  body,
  link,
  srOnly = false,
}: {
  id: string;
  title: string;
  body?: string;
  link?: React.ReactNode;
  srOnly?: boolean;
}) {
  if (srOnly) {
    return (
      <h2 id={id} className="sr-only">
        {title}
      </h2>
    );
  }
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="max-w-3xl">
        <h2 id={id} className="font-display text-headline text-balance break-keep text-white">
          {title}
        </h2>
        {body ? <p className="mt-4 text-lg break-keep text-white/80">{body}</p> : null}
      </div>
      {link}
    </div>
  );
}

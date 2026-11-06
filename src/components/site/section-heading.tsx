type Props = { id: string; title: string; body?: string };

export function SectionHeading({ id, title, body }: Props) {
  return (
    <div className="max-w-3xl">
      <h2 id={id} className="font-display text-headline text-balance break-keep text-white">
        {title}
      </h2>
      {body ? <p className="mt-4 max-w-2xl text-lg break-keep text-white/75">{body}</p> : null}
    </div>
  );
}

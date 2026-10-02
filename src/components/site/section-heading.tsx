type Props = { id: string; title: string; body?: string };

export function SectionHeading({ id, title, body }: Props) {
  return (
    <div className="max-w-3xl">
      <h2
        id={id}
        className="font-display text-[clamp(1.9rem,4vw,3.25rem)] leading-[1.05] font-[800] text-balance break-keep text-cobalt"
      >
        {title}
      </h2>
      {body ? <p className="mt-4 max-w-2xl text-lg break-keep text-ink-soft">{body}</p> : null}
    </div>
  );
}

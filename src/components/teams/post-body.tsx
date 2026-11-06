import { linkify } from '@/lib/teams/text';

// A post is plain text. React escapes the words, and only http and https addresses become links, so
// whatever someone typed stays what it looks like.
export function PostBody({ text }: { text: string }) {
  return (
    <div className="text-lg leading-relaxed wrap-anywhere break-keep whitespace-pre-wrap text-white/85">
      {linkify(text).map((part, index) =>
        part.kind === 'link' ? (
          <a
            key={index}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="text-white underline underline-offset-4"
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </div>
  );
}

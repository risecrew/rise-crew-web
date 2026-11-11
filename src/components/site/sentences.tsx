// A short paragraph set one sentence to a line, so no sentence breaks in the middle on a wide
// screen. A sentence ends at a full stop followed by a space; a narrow screen still wraps inside one.
export function Sentences({ text }: { text: string }) {
  return text
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map((sentence, index) => (
      <span key={index} className="block">
        {sentence}
      </span>
    ));
}

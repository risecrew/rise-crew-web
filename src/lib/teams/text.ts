export type TextPart = { kind: 'text' | 'link'; value: string };

// An address starts with http(s):// and a letter or digit, and ends at a space, a quote, an angle
// bracket or Korean/CJK text, since Korean sentences often run straight on from an address.
const ADDRESS = /https?:\/\/[a-zA-Z0-9][^\s<>"'ᄀ-ᇿ　-鿿가-힯＀-￯]*/g;

function trimAddress(address: string): string {
  let end = address.length;
  for (;;) {
    const last = address[end - 1];
    if (last !== undefined && '.,;:!?'.includes(last)) {
      end -= 1;
      continue;
    }
    if (last === ')') {
      const body = address.slice(0, end);
      const opens = body.split('(').length;
      const closes = body.split(')').length;
      if (closes > opens) {
        end -= 1;
        continue;
      }
    }
    return address.slice(0, end);
  }
}

// Splits plain text into words and links for display. Only http and https become links, so the
// result is safe to put in an href. Joining the values gives the text back exactly.
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let position = 0;
  const pushText = (value: string) => {
    if (value) parts.push({ kind: 'text', value });
  };

  for (const match of text.matchAll(ADDRESS)) {
    const address = trimAddress(match[0]);
    pushText(text.slice(position, match.index));
    parts.push({ kind: 'link', value: address });
    position = match.index + address.length;
  }
  pushText(text.slice(position));
  return parts;
}

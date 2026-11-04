// Reads the sign-in emails that the local Supabase stack catches in Mailpit. Local only: the
// stack never sends real mail.

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54324';
const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 15_000;

type MailpitSummary = { ID: string; Created: string; To: { Address: string }[] };
type MailpitMessage = { HTML: string; Text: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/${path}`);
  if (!response.ok) throw new Error(`Mailpit ${path} answered ${response.status}`);
  return (await response.json()) as T;
}

// Deletes every message sent to `email`, so the next latestLinkFor cannot return an older link.
// Each new link also invalidates the previous one for the same account, so a stale link is never
// a usable answer anyway.
export async function clearMessagesFor(email: string): Promise<void> {
  const query = encodeURIComponent(`to:${email}`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`, { method: 'DELETE' });
  if (!response.ok)
    throw new Error(`Mailpit could not clear mail for ${email}: ${response.status}`);
}

// The sign-in link from the newest message sent to `email`. Waits for the message to arrive.
export async function latestLinkFor(email: string): Promise<string> {
  const wanted = email.toLowerCase();
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { messages } = await getJson<{ messages: MailpitSummary[] }>('messages?limit=50');
    const newest = messages
      .filter((m) => m.To.some((to) => to.Address.toLowerCase() === wanted))
      .sort((a, b) => b.Created.localeCompare(a.Created))[0];

    if (newest) {
      const { HTML } = await getJson<MailpitMessage>(`message/${newest.ID}`);
      const href = /href="(https?:\/\/[^"]+)"/.exec(HTML)?.[1];
      if (!href) throw new Error(`The newest email to ${email} has no link in it.`);
      return href.replaceAll('&amp;', '&');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`No email to ${email} reached Mailpit within ${POLL_TIMEOUT_MS / 1000}s.`);
}

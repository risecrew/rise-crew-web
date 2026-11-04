import { ROLE_ORDER, type AppRole } from './roles';

export type TokenClaims = { role: AppRole; blocked: boolean };

function isRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (ROLE_ORDER as readonly string[]).includes(value);
}

// The role and the block flag the sign-in hook puts in an access token (`app_role`, `blocked`),
// read without checking the signature. That is fine for what the header does with them (decide
// what to show) and for nothing else: a token is stale for up to an hour after a demotion, and
// anyone can edit their own copy of it. Every page and action that matters asks the database.
// Returns null when the text is not a token with a JSON object inside.
export function readTokenClaims(token: string): TokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  let claims: unknown;
  try {
    // Only ASCII keys are read, so the bytes need no UTF-8 decoding (names elsewhere in the token
    // may hold Korean, which JSON.parse accepts as it is).
    claims = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
  } catch {
    return null;
  }
  if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) return null;

  const { app_role: role, blocked } = claims as Record<string, unknown>;
  return { role: isRole(role) ? role : 'guest', blocked: blocked === true };
}

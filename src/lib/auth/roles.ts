export type AppRole = 'guest' | 'member' | 'operator' | 'admin';

// Lowest to highest. A role can do everything the roles before it can.
export const ROLE_ORDER: readonly AppRole[] = ['guest', 'member', 'operator', 'admin'];

export function atLeast(role: AppRole, min: AppRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

// Who may move an account from one role to another (spec §7.4). Operators only swap guest and
// member; admins can set any role. A change to the same role is not a change. The members screen
// checks this for every target on the server, and the database also refuses writes that do not
// come from the secret key.
export function canChangeRole(actor: AppRole, from: AppRole, to: AppRole): boolean {
  if (from === to) return false;
  if (actor === 'admin') return true;
  if (actor === 'operator') {
    return !atLeast(from, 'operator') && !atLeast(to, 'operator');
  }
  return false;
}

// Who may block an account. Nobody can block themselves. Operators can block only people below
// operator; admins can block anyone else.
export function canBlock(actor: AppRole, target: AppRole, self: boolean): boolean {
  if (self) return false;
  if (actor === 'admin') return true;
  if (actor === 'operator') return !atLeast(target, 'operator');
  return false;
}

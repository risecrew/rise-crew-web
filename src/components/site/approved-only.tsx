'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { atLeast } from '@/lib/auth/roles';
import { getServerSnapshot, getSnapshot, subscribe } from './account-store';

// What only approved accounts see in the menus: the notices. Read in the browser like the account
// menu, so the pages around it stay static. This only decides what to show; the pages themselves and
// the database are what keep anyone else out.
export function ApprovedOnly({ children }: { children: ReactNode }) {
  const account = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return account.status === 'in' && atLeast(account.role, 'guest') ? children : null;
}

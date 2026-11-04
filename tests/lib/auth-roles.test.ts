import { describe, expect, it } from 'vitest';
import { ROLE_ORDER, atLeast, canBlock, canChangeRole, type AppRole } from '@/lib/auth/roles';

describe('ROLE_ORDER and atLeast', () => {
  it('orders the roles from guest up to admin', () => {
    expect(ROLE_ORDER).toEqual(['guest', 'member', 'operator', 'admin']);
  });

  it('compares a role against a minimum', () => {
    expect(atLeast('admin', 'operator')).toBe(true);
    expect(atLeast('operator', 'operator')).toBe(true);
    expect(atLeast('member', 'operator')).toBe(false);
    expect(atLeast('guest', 'member')).toBe(false);
    expect(atLeast('guest', 'guest')).toBe(true);
  });
});

describe('canChangeRole', () => {
  it('lets an operator move people between guest and member only', () => {
    expect(canChangeRole('operator', 'guest', 'member')).toBe(true);
    expect(canChangeRole('operator', 'member', 'guest')).toBe(true);
    expect(canChangeRole('operator', 'member', 'operator')).toBe(false);
    expect(canChangeRole('operator', 'guest', 'admin')).toBe(false);
    expect(canChangeRole('operator', 'operator', 'member')).toBe(false);
    expect(canChangeRole('operator', 'admin', 'member')).toBe(false);
  });

  it('lets an admin change any role', () => {
    expect(canChangeRole('admin', 'member', 'operator')).toBe(true);
    expect(canChangeRole('admin', 'guest', 'admin')).toBe(true);
    expect(canChangeRole('admin', 'operator', 'member')).toBe(true);
    expect(canChangeRole('admin', 'admin', 'member')).toBe(true);
  });

  it('refuses members and guests whatever they ask for', () => {
    for (const actor of ['member', 'guest'] as const) {
      for (const from of ROLE_ORDER) {
        for (const to of ROLE_ORDER) {
          expect(canChangeRole(actor, from, to)).toBe(false);
        }
      }
    }
  });

  it('refuses a change from a role to the same role', () => {
    for (const actor of ROLE_ORDER) {
      for (const role of ROLE_ORDER) {
        expect(canChangeRole(actor, role, role)).toBe(false);
      }
    }
  });
});

describe('canBlock', () => {
  it('lets an operator block members and guests but not operators or admins', () => {
    expect(canBlock('operator', 'member', false)).toBe(true);
    expect(canBlock('operator', 'guest', false)).toBe(true);
    expect(canBlock('operator', 'operator', false)).toBe(false);
    expect(canBlock('operator', 'admin', false)).toBe(false);
  });

  it('lets an admin block anyone but themselves', () => {
    expect(canBlock('admin', 'operator', false)).toBe(true);
    expect(canBlock('admin', 'member', false)).toBe(true);
    expect(canBlock('admin', 'admin', false)).toBe(true);
    expect(canBlock('admin', 'admin', true)).toBe(false);
  });

  it('never lets anyone block their own account', () => {
    for (const actor of ROLE_ORDER) {
      expect(canBlock(actor, actor, true)).toBe(false);
    }
  });

  it('refuses members and guests', () => {
    const lowRoles: AppRole[] = ['member', 'guest'];
    for (const actor of lowRoles) {
      for (const target of ROLE_ORDER) {
        expect(canBlock(actor, target, false)).toBe(false);
      }
    }
  });
});

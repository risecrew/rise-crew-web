import { describe, expect, it } from 'vitest';
import { passwordProblem } from '@/lib/auth/password';

describe('passwordProblem', () => {
  it('accepts 8 characters with a letter and a number', () => {
    expect(passwordProblem('abcdefg1')).toBeNull();
  });

  it('refuses one that is too short', () => {
    expect(passwordProblem('abcdef1')).toBe('invalid');
  });

  it('refuses letters alone and numbers alone', () => {
    expect(passwordProblem('abcdefgh')).toBe('invalid');
    expect(passwordProblem('12345678')).toBe('invalid');
  });

  it('counts bytes for the upper limit, as the hash does', () => {
    expect(passwordProblem(`a1${'x'.repeat(70)}`)).toBeNull();
    expect(passwordProblem(`a1${'x'.repeat(71)}`)).toBe('tooLong');
    expect(passwordProblem(`a1${'가'.repeat(24)}`)).toBe('tooLong');
  });
});

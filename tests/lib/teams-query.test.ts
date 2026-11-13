import { describe, expect, it } from 'vitest';
import { isUuid, parseTeamsQuery } from '@/lib/teams/query';

describe('parseTeamsQuery', () => {
  it('ignores what it does not recognize', () => {
    expect(parseTeamsQuery({ field: 'zzz', cohort: 'abc', page: '-1' })).toEqual({
      cohort: null,
      page: 1,
    });
  });
  it('ignores a field from an old shared link (teams have none any more)', () => {
    expect(parseTeamsQuery({ field: 'mobility', cohort: '3' })).toEqual({ cohort: 3, page: 1 });
  });
  it('reads good values', () => {
    expect(parseTeamsQuery({ cohort: '3', page: '2' })).toEqual({
      cohort: 3,
      page: 2,
    });
  });
  it('takes the first of a repeated value', () => {
    expect(parseTeamsQuery({ cohort: ['3', '4'] })).toEqual({
      cohort: 3,
      page: 1,
    });
  });
  it('refuses forms of a number that are not plain', () => {
    for (const value of ['0', '1.5', '1e3', ' 1', '99999999999']) {
      expect(parseTeamsQuery({ cohort: value }).cohort).toBeNull();
      expect(parseTeamsQuery({ page: value }).page).toBe(1);
    }
  });
});

describe('isUuid', () => {
  it('knows a UUID', () => {
    expect(isUuid('7e590000-0000-4000-8000-000000000a01')).toBe(true);
  });
  it('refuses anything else', () => {
    for (const value of ['', 'abc', '7e590000-0000-4000-8000-000000000a01x', '../x']) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

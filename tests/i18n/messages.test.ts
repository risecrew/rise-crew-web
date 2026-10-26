import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';

function flatten(obj: object, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(acc, flatten(v, key));
    else acc[key] = v;
    return acc;
  }, {});
}

describe('messages', () => {
  const k = flatten(ko);
  const e = flatten(en);

  it('ko and en have the same keys', () => {
    expect(Object.keys(e).sort()).toEqual(Object.keys(k).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries({ ...k, ...e })) {
      expect(typeof value === 'string' && value.trim().length > 0, key).toBe(true);
    }
  });

  it('never uses the outdated organization name', () => {
    expect(JSON.stringify(ko)).not.toContain('RISE 사업단');
  });
});

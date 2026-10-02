import { describe, expect, it } from 'vitest';
import {
  officerSchema,
  partnerSchema,
  recruitmentSchema,
  stampSchema,
  statSchema,
} from '@/content/schema';

const L = (ko: string, en: string) => ({ ko, en });

const baseStamp = {
  id: 'aix',
  date: '2026-01-30',
  city: L('서울', 'Seoul'),
  country: 'KR',
  title: L('대회', 'Contest'),
  stage: 'global',
};

describe('localized text', () => {
  it('rejects a missing English string', () => {
    const r = statSchema.safeParse({
      id: 'members',
      value: '90+',
      label: { ko: '멤버', en: '' },
      basis: L('2026.01 기준', 'As of Jan 2026'),
    });
    expect(r.success).toBe(false);
  });
});

describe('statSchema', () => {
  it('requires a basis', () => {
    const r = statSchema.safeParse({ id: 'members', value: '90+', label: L('멤버', 'Members') });
    expect(r.success).toBe(false);
  });
});

describe('stampSchema', () => {
  it('rejects a done stamp without evidence', () => {
    const r = stampSchema.safeParse({ ...baseStamp, status: 'done', evidence: [] });
    expect(r.success).toBe(false);
  });

  it('accepts a done stamp with evidence', () => {
    const r = stampSchema.safeParse({
      ...baseStamp,
      status: 'done',
      evidence: [{ kind: 'press', label: L('에듀플러스', 'Edu Plus') }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts a planned stamp without evidence', () => {
    const r = stampSchema.safeParse({ ...baseStamp, status: 'planned', evidence: [] });
    expect(r.success).toBe(true);
  });

  it('accepts an undated stamp', () => {
    const r = stampSchema.safeParse({
      ...baseStamp,
      date: undefined,
      status: 'done',
      evidence: [{ kind: 'document', label: L('소개서', 'Brochure') }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed date', () => {
    const r = stampSchema.safeParse({
      ...baseStamp,
      date: '2026/01/30',
      status: 'planned',
      evidence: [],
    });
    expect(r.success).toBe(false);
  });
});

describe('partnerSchema', () => {
  it('rejects a logo that is not approved', () => {
    const r = partnerSchema.safeParse({
      id: 'kakao',
      name: L('카카오모빌리티', 'Kakao Mobility'),
      kind: 'company',
      logo: '/partners/kakao.svg',
      logoApproved: false,
    });
    expect(r.success).toBe(false);
  });

  it('accepts a partner shown as text', () => {
    const r = partnerSchema.safeParse({
      id: 'kakao',
      name: L('카카오모빌리티', 'Kakao Mobility'),
      kind: 'company',
      logoApproved: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('officerSchema', () => {
  it('rejects a name without consent', () => {
    const r = officerSchema.safeParse({
      id: 'president',
      role: L('회장', 'President'),
      name: L('홍길동', 'Hong Gildong'),
      consent: false,
    });
    expect(r.success).toBe(false);
  });

  it('accepts a role-only officer without consent', () => {
    const r = officerSchema.safeParse({
      id: 'president',
      role: L('회장', 'President'),
      consent: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('recruitmentSchema', () => {
  it('requires an apply URL when open', () => {
    const r = recruitmentSchema.safeParse({ status: 'open', period: L('3월', 'March') });
    expect(r.success).toBe(false);
  });

  it('requires a next notice when closed', () => {
    const r = recruitmentSchema.safeParse({ status: 'closed' });
    expect(r.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import * as content from '@/lib/content';

const getters = {
  stats: content.getStats,
  stamps: content.getStamps,
  steps: content.getGrowthSteps,
  programs: content.getPrograms,
  mentors: content.getMentors,
  partners: content.getPartners,
  officers: content.getOfficers,
  press: content.getPress,
  faqs: content.getFaqs,
  benefits: content.getBenefits,
};

describe('content data', () => {
  for (const [name, get] of Object.entries(getters)) {
    it(`${name}: ids are unique and the list is not empty`, async () => {
      const items = (await get()) as { id: string }[];
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    });
  }

  it('has the three cover stats', async () => {
    const ids = (await content.getStats()).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['members', 'teams', 'mentors']));
  });

  it('has 19 named mentors and 5 growth steps', async () => {
    expect(await content.getMentors()).toHaveLength(19);
    expect(await content.getGrowthSteps()).toHaveLength(5);
  });

  it('never uses the outdated organization name', async () => {
    const json = JSON.stringify(await Promise.all(Object.values(getters).map((g) => g())));
    expect(json).not.toContain('RISE 사업단');
  });
});

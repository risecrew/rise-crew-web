import { existsSync } from 'node:fs';
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
  photos: content.getPhotos,
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

describe('photos', () => {
  it('every photo file exists under public/', async () => {
    for (const photo of await content.getPhotos()) {
      expect(existsSync(`public${photo.src}`), photo.src).toBe(true);
    }
  });
  it('getPhoto finds a photo by id', async () => {
    const [first] = await content.getPhotos();
    expect((await content.getPhoto(first.id))?.src).toBe(first.src);
  });
});

describe('stamp photos', () => {
  it('every photo a stamp points to exists', async () => {
    const ids = new Set((await content.getPhotos()).map((p) => p.id));
    for (const stamp of await content.getStamps()) {
      if (stamp.photo) expect(ids.has(stamp.photo), `${stamp.id} → ${stamp.photo}`).toBe(true);
    }
  });
  it('the four overseas stamps with photos can fill the global slides', async () => {
    const withPhotos = (await content.getStamps()).filter((s) => s.stage === 'global' && s.photo);
    expect(withPhotos.map((s) => s.id).sort()).toEqual(
      ['beyond-expo', 'smu-vibe-coding', 'sushi-tech', 'techfest-vietnam'].sort(),
    );
  });
});

describe('contest stats', () => {
  it('has the AI+X competition figures for the contest slide', async () => {
    const ids = (await content.getStats()).map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['contest-countries', 'contest-teams', 'vcc-sessions']),
    );
  });
});

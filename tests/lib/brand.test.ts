import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';

const css = readFileSync('src/app/globals.css', 'utf8');
const cssName: Record<keyof typeof BRAND, string> = {
  cobalt: 'cobalt',
  lime: 'lime',
  leaf: 'leaf',
  teal: 'teal',
  sky: 'sky',
  ocean: 'ocean',
  paper: 'paper',
  paperEdge: 'paper-edge',
  ink: 'ink',
  inkSoft: 'ink-soft',
  stage: 'stage',
};

describe('brand tokens', () => {
  for (const [key, hex] of Object.entries(BRAND)) {
    it(`globals.css defines --color-${cssName[key as keyof typeof BRAND]} as ${hex}`, () => {
      expect(css).toContain(`--color-${cssName[key as keyof typeof BRAND]}: ${hex};`);
    });
  }
});

import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The display type scale in globals.css adds its own `text-*` sizes. tailwind-merge does not know
// them and would read `text-display` as a colour, so `text-display text-lime` lost the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['numeral', 'wordmark', 'display', 'hero', 'headline', 'subhead'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

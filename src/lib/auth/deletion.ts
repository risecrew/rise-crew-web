// The delete step of My page. This module has no runtime imports, so the form in the browser and
// the server action can both use it.

// Whether what was typed is the word the page asked for (`탈퇴`, `delete`). Spaces around it do
// not count, since a phone's keyboard may leave one; anything else, capital letters included,
// does. The word is compared in its composed form, so a Korean word that came in as separate
// letters (pasted from some file names) is still the word.
export function confirmsDeletion(typed: unknown, word: string): boolean {
  return typeof typed === 'string' && typed.trim().normalize('NFC') === word.normalize('NFC');
}

// What a refused deletion sends back to the form. `confirm` is the word not matching, `failed`
// anything else. `typed` is what was in the field, so the form can show it again, and `at` tells
// one attempt from the next so the form can announce the same refusal twice. A deletion that went
// through sends nothing back: the visitor is redirected.
export type DeletionFailure = { error: 'confirm' | 'failed'; typed: string; at: number };
export type DeletionState = DeletionFailure | null;

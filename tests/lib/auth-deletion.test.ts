import { describe, expect, it } from 'vitest';
import { confirmsDeletion } from '@/lib/auth/deletion';

describe('confirmsDeletion', () => {
  it('accepts the word, with or without spaces around it', () => {
    expect(confirmsDeletion('탈퇴', '탈퇴')).toBe(true);
    expect(confirmsDeletion('  탈퇴 ', '탈퇴')).toBe(true);
    expect(confirmsDeletion(' 탈퇴　', '탈퇴')).toBe(true);
    expect(confirmsDeletion('delete\n', 'delete')).toBe(true);
  });

  it('accepts the Korean word typed as separate letters', () => {
    const separate = '탈퇴'.normalize('NFD');
    expect(separate).not.toBe('탈퇴');
    expect(confirmsDeletion(separate, '탈퇴')).toBe(true);
  });

  it('refuses anything that is not exactly the word', () => {
    for (const typed of ['', ' ', '탈', '탈퇴해요', '탈 퇴', '탈퇴!']) {
      expect(confirmsDeletion(typed, '탈퇴'), typed).toBe(false);
    }
    for (const typed of ['', 'delet', 'deleted', 'delete me', 'de lete', 'Delete', 'DELETE']) {
      expect(confirmsDeletion(typed, 'delete'), typed).toBe(false);
    }
  });

  it('does not take one language’s word for the other’s', () => {
    expect(confirmsDeletion('delete', '탈퇴')).toBe(false);
    expect(confirmsDeletion('탈퇴', 'delete')).toBe(false);
  });

  it('refuses a value that is not text (a missing field, an uploaded file)', () => {
    expect(confirmsDeletion(null, '탈퇴')).toBe(false);
    expect(confirmsDeletion(undefined, 'delete')).toBe(false);
    expect(confirmsDeletion(new File(['탈퇴'], 'x.txt'), '탈퇴')).toBe(false);
  });
});

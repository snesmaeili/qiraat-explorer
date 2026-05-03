import { describe, it, expect } from 'vitest';
import { alignWords } from '../src/lib/alignment.js';

describe('Word-level alignment', () => {
  it('aligns identical verses with zero diffs', () => {
    const a = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];
    const b = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];
    const out = alignWords(a, b);
    expect(out).toHaveLength(4);
    for (const [x, y] of out) {
      expect(x).toBe(y);
    }
  });

  it('aligns Q 1:4 — single rasm difference at index 0', () => {
    const hafs = ['مَٰلِكِ', 'يَوْمِ', 'ٱلدِّينِ'];
    const warsh = ['مَلِكِ', 'يَوْمِ', 'ٱلدِّينِ'];
    const out = alignWords(hafs, warsh);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual(['مَٰلِكِ', 'مَلِكِ']);
    expect(out[1][0]).toBe(out[1][1]);
    expect(out[2][0]).toBe(out[2][1]);
  });

  it('aligns Q 2:23-style hypothetical: extra word in B', () => {
    const a = ['وَإِن', 'كُنتُمْ', 'فِى', 'رَيْبٍ'];
    const b = ['وَإِنْ', 'كُنتُمْ', 'فِى', 'مِن', 'رَيْبٍ'];
    const out = alignWords(a, b);
    // Rasm-equal first three (وَإِن normalizes to وان under rasm rules).
    expect(out.find(([x, y]) => x === null || y === null)).toBeTruthy();
    // Last token of A and B should match.
    expect(out[out.length - 1]).toEqual(['رَيْبٍ', 'رَيْبٍ']);
  });

  it('aligns Q 2:9 — variant on middle token', () => {
    // Hafs: وَمَا يَخْدَعُونَ ; Warsh-line: وَمَا يُخَٰدِعُونَ
    const hafs = ['وَمَا', 'يَخْدَعُونَ', 'إِلَّآ'];
    const warsh = ['وَمَا', 'يُخَٰدِعُونَ', 'إِلَّآ'];
    const out = alignWords(hafs, warsh);
    expect(out).toHaveLength(3);
    expect(out[0][0]).toBe(out[0][1]); // identical
    expect(out[1][0]).toBe('يَخْدَعُونَ');
    expect(out[1][1]).toBe('يُخَٰدِعُونَ');
    expect(out[1][0]).not.toBe(out[1][1]);
    expect(out[2][0]).toBe(out[2][1]); // identical
  });
});

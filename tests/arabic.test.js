import { describe, it, expect } from 'vitest';
import {
  stripDiacritics,
  normalizeRasm,
  classifyDiff,
  tokenize,
} from '../src/lib/arabic.js';

// Use Unicode escapes for Arabic literals so the source file has no RTL bytes
// (avoids editor/transport corruption issues observed during development).
const MALIK_HAFS = 'مَٰلِكِ';        // مَٰلِكِ
const MALIK_WARSH = 'مَلِكِ';             // مَلِكِ
const BISMI = 'بِسْمِ';                   // بِسْمِ
const RAHMAN = 'ٱلرَّحْمَٰنِ'; // ٱلرَّحْمَٰنِ
const ALLAH = 'ٱللَّهِ';             // ٱللَّهِ
const IBRAHIM = 'إِبْرَٰهِۦمُ'; // إِبْرَٰهِۦمُ
const ARJULAKUM = 'وَأَرْجُلَكُمْ'; // وَأَرْجُلَكُمْ
const ARJULIKUM = 'وَأَرْجُلِكُمْ'; // وَأَرْجُلِكُمْ
const WASSA = 'وَوَصَّىٰ'; // وَوَصَّىٰ
const AWSA = 'وَأَوْصَىٰ'; // وَأَوْصَىٰ
const VERSE_FATIHA = BISMI + ' ' + ALLAH + ' ' + RAHMAN;

describe('Arabic text utilities', () => {
  it('stripDiacritics removes harakat (and superscript alif)', () => {
    expect(stripDiacritics(MALIK_HAFS)).toBe('ملك'); // ملك
    expect(stripDiacritics(BISMI)).toBe('بسم');       // بسم
  });

  it('stripDiacritics is idempotent', () => {
    const once = stripDiacritics(RAHMAN);
    expect(stripDiacritics(once)).toBe(once);
  });

  it('normalizeRasm collapses alif variants and promotes superscripts', () => {
    expect(normalizeRasm(ALLAH)).toBe('الله'); // الله
    // Superscript alif (U+0670) and small high yāʾ (U+06E6) → alif/yāʾ
    expect(normalizeRasm(IBRAHIM)).toBe('ابراهيم'); // ابرهيم
  });

  it('classifyDiff distinguishes rasm vs diacritic vs identical', () => {
    expect(classifyDiff(MALIK_HAFS, MALIK_WARSH)).toBe('rasm');
    expect(classifyDiff(ARJULAKUM, ARJULIKUM)).toBe('diacritic');
    expect(classifyDiff(WASSA, AWSA)).toBe('rasm');
    expect(classifyDiff(BISMI, BISMI)).toBe('identical');
  });

  it('tokenize splits on whitespace and drops empties', () => {
    const t = tokenize(VERSE_FATIHA);
    expect(t).toHaveLength(3);
    expect(t[0]).toBe(BISMI);
    expect(tokenize('   ')).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });
});

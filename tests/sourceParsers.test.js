import { describe, it, expect } from 'vitest';
import { parseTanzilLinePerAyah, parseKfgqpcJson, tokenizeSourceAyah } from '../src/lib/sourceParsers.js';

describe('parseTanzilLinePerAyah', () => {
  it('parses valid Tanzil-style lines', () => {
    const text = '1|1|بسم الله الرحمن الرحيم\n1|2|الحمد لله رب العالمين\n';
    const ayahs = parseTanzilLinePerAyah(text);
    expect(ayahs.size).toBe(2);
    expect(ayahs.get('1:1')).toBe('بسم الله الرحمن الرحيم');
    expect(ayahs.get('1:2')).toBe('الحمد لله رب العالمين');
  });

  it('strips only trailing CR/LF', () => {
    const text = '1|1|بسم الله\r\n1|2|الحمد لله\n';
    const ayahs = parseTanzilLinePerAyah(text);
    expect(ayahs.get('1:1')).toBe('بسم الله');
    expect(ayahs.get('1:2')).toBe('الحمد لله');
  });

  it('ignores comments and blank lines', () => {
    const text = '# This is a comment\n\n1|1|Text\n# Another comment\n';
    const ayahs = parseTanzilLinePerAyah(text);
    expect(ayahs.size).toBe(1);
    expect(ayahs.get('1:1')).toBe('Text');
  });

  it('ignores lines that do not match the strict shape', () => {
    const text = '1|1|Text\nLicense blurb without pipes\n2|1|Text2\n';
    const ayahs = parseTanzilLinePerAyah(text);
    expect(ayahs.size).toBe(2);
    expect(ayahs.get('1:1')).toBe('Text');
    expect(ayahs.get('2:1')).toBe('Text2');
  });

  it('throws on non-string input', () => {
    expect(() => parseTanzilLinePerAyah(null)).toThrow(TypeError);
  });
});

describe('parseKfgqpcJson', () => {
  it('parses shape A (array of objects)', () => {
    const json = [
      { surah: 1, ayah: 1, text: 'بسم الله' },
      { surah: 1, ayah: 2, text: 'الحمد لله' }
    ];
    const ayahs = parseKfgqpcJson(json);
    expect(ayahs.size).toBe(2);
    expect(ayahs.get('1:1')).toBe('بسم الله');
  });

  it('throws on empty array', () => {
    expect(() => parseKfgqpcJson([])).toThrow(/array is empty/);
  });

  it('parses KFGQPC mirror array fields without rewriting text', () => {
    const json = [
      {
        sura_no: 1,
        aya_no: 4,
        aya_text: 'source text with marker ٣',
      },
    ];
    const ayahs = parseKfgqpcJson(json);
    expect(ayahs.size).toBe(1);
    expect(ayahs.get('1:4')).toBe(json[0].aya_text);
  });

  it('parses KFGQPC Hafs array fields without rewriting text', () => {
    const json = [
      {
        sora: 114,
        aya_no: 6,
        aya_text: 'source text with marker ٦',
      },
    ];
    const ayahs = parseKfgqpcJson(json);
    expect(ayahs.size).toBe(1);
    expect(ayahs.get('114:6')).toBe(json[0].aya_text);
  });

  it('throws if array entries lack surah, ayah, or text', () => {
    expect(() => parseKfgqpcJson([{ surah: 1, text: 'Text' }])).toThrow(/missing surah\/ayah\/text/);
  });

  it('parses shape B (flat object keyed by S:A)', () => {
    const json = { '1:1': 'Text 1', '1:2': 'Text 2' };
    const ayahs = parseKfgqpcJson(json);
    expect(ayahs.size).toBe(2);
    expect(ayahs.get('1:1')).toBe('Text 1');
  });

  it('parses shape C (nested object)', () => {
    const json = { '1': { '1': 'Text 1', '2': 'Text 2' } };
    const ayahs = parseKfgqpcJson(json);
    expect(ayahs.size).toBe(2);
    expect(ayahs.get('1:1')).toBe('Text 1');
  });

  it('throws on unrecognised object shapes', () => {
    expect(() => parseKfgqpcJson({ invalid: 'shape' })).toThrow(/unrecognised shape/);
    expect(() => parseKfgqpcJson({ '1': { 'invalid': 'ayah' } })).toThrow(/not numeric/);
    expect(() => parseKfgqpcJson({ '1': { '1': 123 } })).toThrow(/not a string/);
  });

  it('throws on null or undefined input', () => {
    expect(() => parseKfgqpcJson(null)).toThrow(/input is null/);
  });
});

describe('tokenizeSourceAyah', () => {
  it('splits text by whitespace', () => {
    const tokens = tokenizeSourceAyah('بسم الله الرحمن الرحيم');
    expect(tokens).toEqual(['بسم', 'الله', 'الرحمن', 'الرحيم']);
  });

  it('handles multiple spaces', () => {
    const tokens = tokenizeSourceAyah('بسم  الله\tالرحمن\nالرحيم');
    expect(tokens).toEqual(['بسم', 'الله', 'الرحمن', 'الرحيم']);
  });

  it('returns empty array on non-string input', () => {
    expect(tokenizeSourceAyah(null)).toEqual([]);
  });
});

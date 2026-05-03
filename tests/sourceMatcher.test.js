import { describe, it, expect } from 'vitest';
import { matchReadingAgainstSource } from '../src/lib/sourceMatcher.js';

describe('matchReadingAgainstSource', () => {
  const mockVariantGroup = { surah: 1, ayah: 1, wordIndex: 1 };
  const mockReading = { riwayah: 'hafs', text: 'الله' };
  
  const mockCorpus = {
    sourceId: 'tanzil-hafs',
    riwayah: 'hafs',
    ayahs: new Map([
      ['1:1', 'بسم الله الرحمن الرحيم']
    ])
  };

  it('returns exact_word_index_match for positional match', () => {
    const result = matchReadingAgainstSource(mockReading, mockVariantGroup, mockCorpus);
    expect(result.status).toBe('exact_word_index_match');
    expect(result.matchedText).toBe('الله');
    expect(result.matchedIndex).toBe(1);
  });

  it('returns exact_elsewhere_in_ayah for non-positional match', () => {
    const shiftedGroup = { surah: 1, ayah: 1, wordIndex: 2 };
    const result = matchReadingAgainstSource(mockReading, shiftedGroup, mockCorpus);
    expect(result.status).toBe('exact_elsewhere_in_ayah');
    expect(result.matchedText).toBe('الله');
    expect(result.matchedIndex).toBe(1); // found at index 1 instead of expected 2
  });

  it('returns ayah_present_but_no_exact_match when text not found', () => {
    const missingReading = { riwayah: 'hafs', text: 'الحمد' };
    const result = matchReadingAgainstSource(missingReading, mockVariantGroup, mockCorpus);
    expect(result.status).toBe('ayah_present_but_no_exact_match');
    expect(result.matchedText).toBeNull();
  });

  it('returns ayah_missing when ayah is not in corpus', () => {
    const absentGroup = { surah: 1, ayah: 2, wordIndex: 0 };
    const result = matchReadingAgainstSource(mockReading, absentGroup, mockCorpus);
    expect(result.status).toBe('ayah_missing');
  });

  it('returns source_not_applicable on riwayah mismatch', () => {
    const mismatchedReading = { riwayah: 'warsh', text: 'الله' };
    const result = matchReadingAgainstSource(mismatchedReading, mockVariantGroup, mockCorpus);
    expect(result.status).toBe('source_not_applicable');
  });

  it('returns source_not_applicable when corpus is null', () => {
    const result = matchReadingAgainstSource(mockReading, mockVariantGroup, null);
    expect(result.status).toBe('source_not_applicable');
  });
});

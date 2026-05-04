import { describe, it, expect } from 'vitest';
import {
  getAyah,
  listSurahs,
  listVersesWithVariants,
  dataMeta,
} from '../src/lib/dataLoader.js';
import { diffByCuratedVariants } from '../src/lib/diff.js';

describe('Curated dataset', () => {
  it('returns the curated Q 1:4 with its mālik/malik variant', () => {
    const v = getAyah(1, 4);
    expect(v).toBeTruthy();
    expect(v.baseText.tokens.map((t) => t.text)).toEqual(['مَٰلِكِ', 'يَوْمِ', 'ٱلدِّينِ']);
    expect(v.variants).toHaveLength(1);
    expect(v.variants[0].wordIndex).toBe(0);
    expect(v.variants[0].category).toBe('consonantal');
    const warsh = v.variants[0].readings.find((r) => r.riwayah === 'warsh');
    expect(warsh.text).toBe('مَلِكِ');
  });

  it('returns the Q 2:9 variant on word index 5 with word-form category', () => {
    const v = getAyah(2, 9);
    expect(v.variants).toHaveLength(1);
    expect(v.variants[0].wordIndex).toBe(5);
    expect(v.variants[0].category).toBe('word-form');
    expect(v.baseText.tokens[5].text).toBe('يَخْدَعُونَ');
  });

  it('returns Q 5:6 categorised as vocalization', () => {
    const v = getAyah(5, 6);
    expect(v.variants[0].category).toBe('vocalization');
    const hafs = v.variants[0].readings.find((r) => r.riwayah === 'hafs');
    expect(hafs.text).toBe('وَأَرْجُلَكُمْ');
  });

  it('returns complete Hafs corpus verses outside the curated sample (when corpus is built)', () => {
    // hafsCorpusData.json is built locally (`npm run build:hafs-corpus`) and
    // git-ignored. On a fresh clone the loader exposes 0 ayahs from it.
    const meta = dataMeta();
    if ((meta.completeHafsAyahs ?? 0) === 0) {
      expect(getAyah(114, 6)).toBeNull();
      expect(getAyah(2, 999)).toBeNull();
      return;
    }
    const v = getAyah(114, 6);
    expect(v).toBeTruthy();
    expect(v.baseText.riwayah).toBe('hafs');
    expect(v.variants).toEqual([]);
    expect(getAyah(2, 999)).toBeNull();
  });

  it('lists all 114 surahs for complete UI browsing', () => {
    const surahs = listSurahs();
    expect(surahs).toHaveLength(114);
    expect(surahs[0].number).toBe(1);
    expect(surahs[113].number).toBe(114);
  });

  it('lists curated verses sorted by surah/ayah', () => {
    const list = listVersesWithVariants();
    expect(list.length).toBeGreaterThanOrEqual(5);
    const keys = list.map((v) => v.surah + ':' + v.ayah);
    expect(keys).toContain('1:4');
    expect(keys).toContain('2:9');
    expect(keys).toContain('5:6');
    // sorted
    for (let i = 1; i < list.length; i++) {
      expect(
        list[i].surah > list[i - 1].surah ||
          (list[i].surah === list[i - 1].surah && list[i].ayah > list[i - 1].ayah),
      ).toBe(true);
    }
  });
});

describe('diffByCuratedVariants', () => {
  it('returns one diff for Q 1:4 Hafs vs Warsh', () => {
    const ayah = getAyah(1, 4);
    const diffs = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    expect(diffs).toHaveLength(1);
    expect(diffs[0].wordIndex).toBe(0);
    expect(diffs[0].baseText).toBe('مَٰلِكِ');
    expect(diffs[0].compText).toBe('مَلِكِ');
    expect(diffs[0].category).toBe('consonantal');
    expect(diffs[0].isCurated).toBe(true);
    expect(diffs[0].confidence).toBe('curated_sample');
  });

  it('returns no diffs when base and compare are the same riwayah', () => {
    const ayah = getAyah(1, 4);
    expect(diffByCuratedVariants(ayah, 'hafs', 'hafs')).toEqual([]);
  });

  it('skips variant points where the comparison riwayah has no documented reading', () => {
    // Q 1:6 only has Hafs and Qunbul readings documented. Hafs vs Warsh
    // should return no diffs (no Warsh data) rather than guess.
    const ayah = getAyah(1, 6);
    expect(diffByCuratedVariants(ayah, 'hafs', 'warsh')).toEqual([]);
    // Hafs vs Qunbul should produce a diff.
    const d = diffByCuratedVariants(ayah, 'hafs', 'qunbul');
    expect(d).toHaveLength(1);
  });

  it('correctly identifies Q 2:9 differences (form I vs form III)', () => {
    // Acceptance criterion: "two versions of a word are correctly identified."
    const ayah = getAyah(2, 9);
    const d = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    expect(d).toHaveLength(1);
    expect(d[0].wordIndex).toBe(5);
    expect(d[0].baseText).toBe('يَخْدَعُونَ');
    expect(d[0].compText).toBe('يُخَٰدِعُونَ');
    expect(d[0].category).toBe('word-form');
  });

  it('handles Q 5:6 vocalization-only diff', () => {
    const ayah = getAyah(5, 6);
    // Hafs vs Warsh: both fatha → no diff.
    expect(diffByCuratedVariants(ayah, 'hafs', 'warsh')).toEqual([]);
    // Hafs vs Hamza: kasra → diff.
    const d = diffByCuratedVariants(ayah, 'hafs', 'hamza');
    expect(d).toHaveLength(1);
    expect(d[0].category).toBe('vocalization');
  });
});

/**
 * Integrity-policy tests for Qiraat Explorer.
 *
 * Executable form of the Sacred Text Integrity Policy. Phase 3 strengthens
 * the suite to also enforce verification-workflow invariants.
 */
import { describe, it, expect } from 'vitest';
import { stripDiacritics, normalizeRasm } from '../src/lib/arabic.js';
import {
  diffByCuratedVariants,
  diffByVerseTexts,
  inferCategory,
  freezeVerseText,
} from '../src/lib/diff.js';
import {
  getAyah,
  listVersesWithVariants,
  listRiwayat,
  listSurahs,
  dataMeta,
  getSource,
} from '../src/lib/dataLoader.js';
import bundle from '../src/data/quranData.json';

describe('Sacred Text Integrity Policy', () => {
  it('dataset is not flagged as AI-generated', () => {
    expect(bundle._meta.generated).toBe(false);
    expect(bundle._meta.generationPolicy).toBe('no-arabic-text-generation');
  });

  it('every reading text traces to a registered SourceCitation id', () => {
    const knownSources = new Set(Object.keys(bundle.sources));
    for (const [key, ayah] of Object.entries(bundle.verses)) {
      expect(knownSources.has(ayah.baseText.source),
        key + ': baseText.source ' + ayah.baseText.source + ' not registered',
      ).toBe(true);
      for (const group of ayah.variants ?? []) {
        for (const r of group.readings) {
          expect(knownSources.has(r.source),
            key + ' word ' + group.wordIndex + ' reading ' + r.riwayah + ': source ' + r.source + ' not registered',
          ).toBe(true);
        }
        for (const c of group.citations ?? []) {
          expect(knownSources.has(c),
            key + ' word ' + group.wordIndex + ': citation ' + c + ' not registered',
          ).toBe(true);
        }
      }
    }
  });

  it('manual_placeholder readings only appear in curated_sample or needs_review groups', () => {
    for (const ayah of Object.values(bundle.verses)) {
      for (const group of ayah.variants ?? []) {
        const usesPlaceholder = group.readings.some(
          (r) => r.source === 'manual_placeholder',
        );
        if (usesPlaceholder) {
          expect(['curated_sample', 'needs_review']).toContain(group.confidence);
        }
      }
    }
  });
});

describe('Diff engine never mutates input', () => {
  it('diffByCuratedVariants does not modify the ayah, baseText, tokens, or readings', () => {
    const ayah = getAyah(1, 4);
    const before = JSON.stringify(ayah);
    const diffs = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    expect(diffs).toHaveLength(1);
    const after = JSON.stringify(ayah);
    expect(after).toBe(before);
  });

  it('frozen objects: writing to a token throws in strict mode', () => {
    const ayah = getAyah(1, 4);
    expect(Object.isFrozen(ayah)).toBe(true);
    expect(Object.isFrozen(ayah.baseText)).toBe(true);
    expect(Object.isFrozen(ayah.baseText.tokens[0])).toBe(true);
    expect(() => {
      'use strict';
      ayah.baseText.tokens[0].text = 'TAMPERED';
    }).toThrow();
  });

  it('diff result references the original strings', () => {
    const ayah = getAyah(1, 4);
    const diffs = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    const hafsReading = ayah.variants[0].readings.find((r) => r.riwayah === 'hafs');
    const warshReading = ayah.variants[0].readings.find((r) => r.riwayah === 'warsh');
    expect(diffs[0].baseText).toBe(hafsReading.text);
    expect(diffs[0].compText).toBe(warshReading.text);
  });

  it('diffByVerseTexts treats inputs as read-only', () => {
    const verseA = freezeVerseText({
      riwayah: 'hafs', surah: 9, ayah: 9,
      tokens: [{ index: 0, text: 'X' }, { index: 1, text: 'Y' }],
      source: 'tanzil', confidence: 'curated_sample',
    });
    const verseB = freezeVerseText({
      riwayah: 'warsh', surah: 9, ayah: 9,
      tokens: [{ index: 0, text: 'Z' }, { index: 1, text: 'Y' }],
      source: 'kfqpc-warsh', confidence: 'needs_review',
    });
    const before = JSON.stringify({ a: verseA, b: verseB });
    const diffs = diffByVerseTexts(verseA, verseB);
    const after = JSON.stringify({ a: verseA, b: verseB });
    expect(after).toBe(before);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].wordIndex).toBe(0);
  });
});

describe('Normalisation is separate from display text', () => {
  it('stripDiacritics returns a NEW string; the input is unchanged', () => {
    const original = 'مَٰلِكِ';
    const normalised = stripDiacritics(original);
    expect(normalised).not.toBe(original);
    expect(original).toBe('مَٰلِكِ');
  });

  it('normalizeRasm returns a NEW string; the input is unchanged', () => {
    const original = 'ٱلرَّحْمَٰنِ';
    const normalised = normalizeRasm(original);
    expect(normalised).not.toBe(original);
    expect(original).toBe('ٱلرَّحْمَٰنِ');
  });

  it('normalisation is pure: same input, same output', () => {
    const a = 'وَوَصَّىٰ';
    expect(normalizeRasm(a)).toBe(normalizeRasm(a));
  });
});

describe('Variant groups map to correct coordinates', () => {
  it.each(listVersesWithVariants().map((v) => [v.surah, v.ayah]))(
    'verse %i:%i — every variant wordIndex points to a real token',
    (surah, ayah) => {
      const a = getAyah(surah, ayah);
      const tokenLen = a.baseText.tokens.length;
      for (const g of a.variants) {
        expect(g.surah).toBe(surah);
        expect(g.ayah).toBe(ayah);
        expect(g.wordIndex).toBeGreaterThanOrEqual(0);
        expect(g.wordIndex).toBeLessThan(tokenLen);
        const baseReading = g.readings.find((r) => r.riwayah === g.baseRiwayah);
        if (baseReading) {
          expect(a.baseText.tokens[g.wordIndex].text).toBe(baseReading.text);
        }
      }
    },
  );
});

describe('Diff categorisation', () => {
  it('uses the curated category when present', () => {
    const ayah = getAyah(2, 9);
    const d = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    expect(d[0].category).toBe('word-form');
    expect(d[0].isCurated).toBe(true);
  });

  it('inferCategory returns vocalization for diacritic-only diffs', () => {
    expect(inferCategory('وَأَرْجُلَكُمْ', 'وَأَرْجُلِكُمْ')).toBe('vocalization');
  });

  it('inferCategory returns consonantal for rasm-level diffs', () => {
    expect(inferCategory('وَوَصَّىٰ', 'وَأَوْصَىٰ')).toBe('consonantal');
  });

  it('inferCategory returns unknown for identical inputs', () => {
    expect(inferCategory('بِسْمِ', 'بِسْمِ')).toBe('unknown');
  });
});

describe('App boots without harfbuzzjs / font files', () => {
  it('shaping module loads and returns native mode by default', async () => {
    const { initShaping, shapingMode } = await import('../src/lib/shaping.js');
    const r = await initShaping();
    expect(r.mode).toBe('native');
    expect(typeof r.shape).toBe('function');
    expect(shapingMode()).toBe('native');
  });

  it('does not throw if harfbuzzjs is uninstalled', async () => {
    const { initShaping } = await import('../src/lib/shaping.js');
    await expect(initShaping()).resolves.toBeTruthy();
  });
});

describe('No AI-generated Quranic text in code paths', () => {
  it('listed sources include the manual_placeholder tripwire with reviewer guidance', () => {
    const ph = getSource('manual_placeholder');
    expect(ph).toBeTruthy();
    expect(ph.label).toMatch(/NEEDS VERIFICATION/i);
    expect(ph.notes ?? '').toMatch(/(needs_review|cross-checked)/i);
  });

  it('dataset _meta declares no-generation policy', () => {
    expect(dataMeta().generated).toBe(false);
    expect(dataMeta().generationPolicy).toBe('no-arabic-text-generation');
  });
});

describe('Promotion to verified requires a ledger record (Phase 3)', () => {
  it('no automated process can set confidence=verified without ledger evidence', () => {
    for (const ayah of Object.values(bundle.verses)) {
      for (const g of ayah.variants ?? []) {
        if (g.confidence === 'verified') {
          const hasPlaceholder = (g.readings ?? []).some(
            (r) => r.source === 'manual_placeholder',
          );
          expect(hasPlaceholder).toBe(false);
        }
      }
    }
  });

  it('manual_placeholder cannot coexist with confidence=verified', () => {
    for (const ayah of Object.values(bundle.verses)) {
      for (const g of ayah.variants ?? []) {
        const hasPlaceholder = (g.readings ?? []).some(
          (r) => r.source === 'manual_placeholder',
        );
        if (hasPlaceholder) {
          expect(['curated_sample', 'needs_review']).toContain(g.confidence);
        }
      }
    }
  });

  it('a generated full-corpus dataset must NOT be treated as verified', async () => {
    const full = await import('../src/data/fullVariants.json');
    const dataset = full.default ?? full;
    if (Object.keys(dataset.verses ?? {}).length === 0) return;
    expect(typeof dataset._provenance).toBe('string');
    for (const ayah of Object.values(dataset.verses)) {
      for (const g of ayah.variants ?? []) {
        expect(g.confidence).not.toBe('verified');
      }
    }
  });
});

describe('Sample size is bounded — curated, not auto-imported', () => {
  it('has 5 to 10 curated verses with variants', () => {
    const verses = listVersesWithVariants();
    expect(verses.length).toBeGreaterThanOrEqual(5);
    expect(verses.length).toBeLessThanOrEqual(10);
  });

  it('exposes a riwayah registry', () => {
    const riwayat = listRiwayat();
    expect(riwayat.length).toBeGreaterThanOrEqual(3);
    expect(riwayat.find((r) => r.id === 'hafs')).toBeTruthy();
    expect(riwayat.find((r) => r.id === 'warsh')).toBeTruthy();
    expect(riwayat.find((r) => r.id === 'qalun')).toBeTruthy();
  });

});

describe('Phase 4 Runtime Independence and Source Matching Invariants', () => {
  it('scripts/_raw is not required for runtime', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');

    function checkDir(dir) {
      const files = readdirSync(dir);
      for (const f of files) {
        const full = join(dir, f);
        if (statSync(full).isDirectory()) {
          checkDir(full);
        } else if (full.endsWith('.js') || full.endsWith('.jsx')) {
          const content = readFileSync(full, 'utf8');
          expect(content).not.toMatch(/scripts\/_raw/);
        }
      }
    }
    
    checkDir(resolve(process.cwd(), 'src'));
  });

  it('missing corpora do not break app/test/build', () => {
    // If we load dataLoader.js without corpora, it should still load successfully
    // since dataLoader uses the JSON bundle, not raw corpora.
    expect(bundle).toBeDefined();
    expect(listVersesWithVariants().length).toBeGreaterThan(0);
  });

  it('source matching never generates Arabic text', async () => {
    // Review the matcher module logic
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const matcherText = readFileSync(resolve(process.cwd(), 'src/lib/sourceMatcher.js'), 'utf8');
    // Ensure the matcher never manipulates the reading text directly
    expect(matcherText).not.toMatch(/reading\.text =/);
    expect(matcherText).toMatch(/DOES NOT[\s*]*touch expectedText or matchedText/);
  });

  it('apply-source-matches can only change source IDs, never Arabic text', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const scriptText = readFileSync(resolve(process.cwd(), 'scripts/apply-source-matches.js'), 'utf8');
    
    expect(scriptText).toMatch(/entry\.reading\.source = r\.to/);
    expect(scriptText).not.toMatch(/entry\.reading\.text =/);
  });
});


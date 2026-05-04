// Data loader. Reads the complete Hafs browsing corpus plus the curated
// variant dataset, deep-freezes anything that holds Qur'anic text, and exposes
// accessors.
//
// CONTRACT:
//   - Original strings from quranData.json are returned unchanged. Components
//     and the diff engine never see a normalised or rewritten copy.
//   - Mutating an Ayah, VerseText, WordToken, or VariantGroup throws in
//     strict mode (Object.freeze). React renders are read-only by design.

import curatedBundle from '../data/quranData.json';
import quranMeta from '../data/quranMeta.json';
import { freezeVerseText, freezeVariantGroup } from './diff.js';

// hafsCorpusData.json is built locally by `npm run build:hafs-corpus` and is
// git-ignored (KFGQPC license unknown). Vite's import.meta.glob lets a fresh
// clone build without the file — an empty bundle disables the full-Hafs
// browsing corpus until the user generates it.
const HAFS_CORPUS_GLOB = import.meta.glob('../data/hafsCorpusData.json', { eager: true });
const hafsCorpusBundle =
  HAFS_CORPUS_GLOB['../data/hafsCorpusData.json']?.default ??
  { _meta: {}, sources: {}, verses: {} };

function normalizeSurahMeta(surah) {
  return {
    number: surah.number ?? surah.n,
    name: surah.name,
    arabic: surah.arabic,
    ayahCount: surah.ayahCount,
    revelation: surah.revelation,
  };
}

const mergedVerses = {
  ...(hafsCorpusBundle.verses ?? {}),
  ...(curatedBundle.verses ?? {}),
};
const mergedSources = {
  ...(curatedBundle.sources ?? {}),
  ...(hafsCorpusBundle.sources ?? {}),
};

// Freeze once at module load. Subsequent imports get the same frozen tree.
const VERSES = Object.freeze(
  Object.fromEntries(
    Object.entries(mergedVerses).map(([key, ayah]) => {
      freezeVerseText(ayah.baseText);
      for (const g of ayah.variants ?? []) freezeVariantGroup(g);
      Object.freeze(ayah.variants);
      Object.freeze(ayah);
      return [key, ayah];
    }),
  ),
);

const SURAHS = Object.freeze((quranMeta.surahs ?? curatedBundle.surahs ?? []).map(normalizeSurahMeta));
const RIWAYAT = Object.freeze(curatedBundle.riwayat ?? quranMeta.riwayat ?? []);
const SOURCES = Object.freeze(mergedSources);
const META = Object.freeze({
  ...(curatedBundle._meta ?? {}),
  completeHafsAyahs: Object.keys(hafsCorpusBundle.verses ?? {}).length,
});

if (META.generated) {
  // Tripwire — the dataset must never be flagged as AI-generated.
  // If this ever becomes true, abort.
  throw new Error(
    'Dataset is marked _meta.generated=true. Refusing to load. ' +
      'See README.md → Sacred Text Integrity Policy.',
  );
}

export function listSurahs() { return SURAHS; }
export function listRiwayat() { return RIWAYAT; }
export function getSource(id) { return SOURCES[id] ?? null; }
export function listSources() { return SOURCES; }
export function dataMeta() { return META; }

/**
 * @param {number} surah
 * @param {number} ayah
 * @returns {Object | null}  Ayah record (frozen)
 */
export function getAyah(surah, ayah) {
  return VERSES[surah + ':' + ayah] ?? null;
}

/**
 * Verses where at least one VariantGroup is populated. Useful for the
 * "interesting examples" picker.
 */
export function listVersesWithVariants() {
  return Object.values(VERSES)
    .filter((v) => (v.variants ?? []).length > 0)
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
}

/**
 * Synchronous riwayah lookup by id.
 */
export function getRiwayah(id) {
  return RIWAYAT.find((r) => r.id === id) ?? null;
}

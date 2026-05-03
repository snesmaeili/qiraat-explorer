// Data loader. Reads the curated dataset, deep-freezes it so anything that
// holds Qur'anic text becomes immutable at runtime, and exposes accessors.
//
// CONTRACT:
//   - Original strings from quranData.json are returned unchanged. Components
//     and the diff engine never see a normalised or rewritten copy.
//   - Mutating an Ayah, VerseText, WordToken, or VariantGroup throws in
//     strict mode (Object.freeze). React renders are read-only by design.

import bundle from '../data/quranData.json';
import { freezeVerseText, freezeVariantGroup } from './diff.js';

// Freeze once at module load. Subsequent imports get the same frozen tree.
const VERSES = Object.freeze(
  Object.fromEntries(
    Object.entries(bundle.verses ?? {}).map(([key, ayah]) => {
      freezeVerseText(ayah.baseText);
      for (const g of ayah.variants ?? []) freezeVariantGroup(g);
      Object.freeze(ayah.variants);
      Object.freeze(ayah);
      return [key, ayah];
    }),
  ),
);

const SURAHS = Object.freeze(bundle.surahs ?? []);
const RIWAYAT = Object.freeze(bundle.riwayat ?? []);
const SOURCES = Object.freeze(bundle.sources ?? {});
const META = Object.freeze(bundle._meta ?? {});

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

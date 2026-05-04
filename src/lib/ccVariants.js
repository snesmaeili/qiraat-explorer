// Corpus Coranicum variant lookup. Reads src/data/ccVariants.json (extracted
// by scripts/extract-cc-variants.js from the CC TEI export — CC BY-SA 4.0)
// and exposes per-word reader attestations grouped by transliterated form.
//
// CC's TEI numbers words from 1; the curated dataset's wordIndex is 0-based.
// We translate by `wordIndex + 1` here.
//
// CC's TEI distribution carries Latin transliteration only — no Arabic
// surface text — so the strings returned by this module are scholarly
// cross-reference, not byte-matchable Arabic.

import ccData from '../data/ccVariants.json';

/**
 * Group CC attestations for a single word position into deduped forms.
 *
 * @param {number} surah        1-based surah number
 * @param {number} ayah         1-based ayah number
 * @param {number} wordIndex    0-based word index, as used in quranData.json
 * @returns {Array<{ form: string, attestations: Array<{id,name,formal?,sigle?,residence?}>, ccIds: string[] }>}
 *          Sorted by descending attestation count. Empty array if no CC data.
 */
export function ccReadingsFor(surah, ayah, wordIndex) {
  const verseKey = surah + ':' + ayah;
  const verse = ccData.verses?.[verseKey];
  if (!verse || verse.length === 0) return [];

  const ccWordKey = String(wordIndex + 1);
  const byForm = new Map();

  for (const item of verse) {
    const text = item.words?.[ccWordKey];
    if (!text) continue;
    if (!byForm.has(text)) {
      byForm.set(text, { form: text, attestations: [], ccIds: [] });
    }
    const entry = byForm.get(text);
    entry.ccIds.push(item.ccId);
    for (const r of item.readers ?? []) {
      entry.attestations.push({
        id: r.id,
        name: r.display,
        formal: r.formal ?? null,
        sigle: r.sigle ?? null,
        residence: r.residence ?? null,
      });
    }
  }

  // Dedupe attestations by reader id within each form (a reader can appear
  // multiple times across different CC variant items for the same form).
  for (const entry of byForm.values()) {
    const seen = new Set();
    entry.attestations = entry.attestations.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }

  return Array.from(byForm.values()).sort(
    (a, b) => b.attestations.length - a.attestations.length,
  );
}

/** Has any CC attestation for the given word position. */
export function hasCCReadingsFor(surah, ayah, wordIndex) {
  return ccReadingsFor(surah, ayah, wordIndex).length > 0;
}

/** Total attestation count across all forms for one word — useful for the
 *  collapsed-summary count in the tooltip. */
export function ccTotalAttestations(surah, ayah, wordIndex) {
  const forms = ccReadingsFor(surah, ayah, wordIndex);
  return forms.reduce((acc, f) => acc + f.attestations.length, 0);
}

/** CC source attribution metadata for footer display. */
export const CC_SOURCE = {
  label: 'Corpus Coranicum',
  url: 'https://corpuscoranicum.de/',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

// Exact source-text matcher.
//
// HARD CONTRACT:
//   - The PRIMARY match logic compares strings byte-for-byte. There is NO
//     normalisation in the primary path: a fatḥa where the source has a
//     kasra is a non-match, full stop.
//   - We additionally produce a DIAGNOSTIC normalised comparison so a
//     reviewer can tell whether a near-miss is purely a diacritic issue.
//     The diagnostic field never replaces matchedText/expectedText.
//   - This module never invents Arabic. It only inspects the strings it is
//     handed and reports what it finds.
//
// Pure functions; never mutates the dataset, the variant group, the
// reading, or the source corpus.

import { stripDiacritics, normalizeRasm } from './arabic.js';
import { tokenizeSourceAyah } from './sourceParsers.js';

/**
 * @typedef {Object} SourceMatchResult
 * @property {'exact_word_index_match' |
 *            'exact_elsewhere_in_ayah' |
 *            'ayah_present_but_no_exact_match' |
 *            'ayah_missing' |
 *            'source_not_applicable'}  status
 * @property {string|null}              matchedText
 * @property {number|null}              matchedIndex
 * @property {string}                   expectedText
 * @property {string}                   sourceId
 * @property {string}                   riwayah
 * @property {number}                   surah
 * @property {number}                   ayah
 * @property {number}                   wordIndex
 * @property {string}                   notes
 * @property {Object|null}              diagnostic
 */

/**
 * Match a single VariantReading against a loaded source corpus.
 *
 * @param {Object} reading        a VariantReading (must have riwayah + text)
 * @param {Object} variantGroup   the parent VariantGroup
 * @param {Object} sourceCorpus   the result of loadLocalSourceCorpus()
 * @param {Object} [baseAyah]     unused for now; reserved for future use
 * @returns {SourceMatchResult}
 */
export function matchReadingAgainstSource(reading, variantGroup, sourceCorpus /* , baseAyah */) {
  const surah = variantGroup.surah;
  const ayah = variantGroup.ayah;
  const wordIndex = variantGroup.wordIndex;
  const expectedText = reading.text;

  const base = {
    expectedText,
    sourceId: sourceCorpus?.sourceId ?? 'unknown',
    riwayah: reading.riwayah,
    surah,
    ayah,
    wordIndex,
    matchedText: null,
    matchedIndex: null,
    notes: '',
    diagnostic: null,
  };

  if (!sourceCorpus || !sourceCorpus.ayahs) {
    return {
      ...base,
      status: 'source_not_applicable',
      notes: 'No source corpus provided.',
    };
  }
  // The corpus's riwayah must match the reading's riwayah. Otherwise we
  // simply have no opinion — a Warsh corpus cannot speak to a Hafs reading.
  if (sourceCorpus.riwayah !== reading.riwayah) {
    return {
      ...base,
      status: 'source_not_applicable',
      notes:
        'Reading riwayah=' + reading.riwayah +
        ' but source corpus riwayah=' + sourceCorpus.riwayah,
    };
  }

  const key = surah + ':' + ayah;
  const ayahText = sourceCorpus.ayahs.get(key);
  if (typeof ayahText !== 'string') {
    return { ...base, status: 'ayah_missing', notes: key + ' not in source corpus' };
  }

  const tokens = tokenizeSourceAyah(ayahText);

  // 1) Exact word-index match (the strict, positional case).
  if (
    typeof wordIndex === 'number' &&
    wordIndex >= 0 &&
    wordIndex < tokens.length &&
    tokens[wordIndex] === expectedText
  ) {
    return {
      ...base,
      status: 'exact_word_index_match',
      matchedText: tokens[wordIndex],
      matchedIndex: wordIndex,
      notes: 'Token at wordIndex ' + wordIndex + ' is exactly equal to reading.text.',
      diagnostic: null,
    };
  }

  // 2) Exact match somewhere in the ayah (non-positional).
  const elsewhereIdx = tokens.indexOf(expectedText);
  if (elsewhereIdx >= 0) {
    return {
      ...base,
      status: 'exact_elsewhere_in_ayah',
      matchedText: tokens[elsewhereIdx],
      matchedIndex: elsewhereIdx,
      notes:
        'Reading found at token index ' + elsewhereIdx +
        ' (expected ' + wordIndex + '). Tokenisation may differ; reviewer judgement required.',
      diagnostic: buildDiagnostic(expectedText, tokens, wordIndex),
    };
  }

  // 3) Ayah present but no exact match anywhere.
  return {
    ...base,
    status: 'ayah_present_but_no_exact_match',
    matchedText: null,
    matchedIndex: null,
    notes:
      'Ayah is present in the source corpus, but reading.text was not found ' +
      'as an exact whitespace-delimited token.',
    diagnostic: buildDiagnostic(expectedText, tokens, wordIndex),
  };
}

/**
 * Build the diagnostic-only comparison block. This block describes what
 * happens under TWO additional, optional normalisations — but DOES NOT
 * touch expectedText or matchedText.
 *
 *   diacriticMatch: true if any token in the ayah equals expectedText after
 *                   diacritic stripping (only)
 *   rasmMatch:      true if any token equals expectedText after rasm
 *                   normalisation (the broader normalisation)
 *
 * Reviewers use this to decide whether a near-miss is a diacritic-only
 * issue or a real divergence. It is NEVER used as the basis for source
 * substitution by `apply-source-matches`.
 */
function buildDiagnostic(expectedText, tokens, wordIndex) {
  const expectedStripped = stripDiacritics(expectedText);
  const expectedRasm = normalizeRasm(expectedText);
  const diacriticMatchIdx = tokens.findIndex(
    (t) => stripDiacritics(t) === expectedStripped,
  );
  const rasmMatchIdx = tokens.findIndex(
    (t) => normalizeRasm(t) === expectedRasm,
  );
  const tokenAtIndex = (typeof wordIndex === 'number' && tokens[wordIndex]) || null;
  return {
    note: 'DIAGNOSTIC ONLY — these comparisons normalise text. They are NOT used to authorise source replacement.',
    tokenAtVariantIndex: tokenAtIndex,
    expectedAfterStripDiacritics: expectedStripped,
    expectedAfterNormalizeRasm: expectedRasm,
    diacriticMatchAt: diacriticMatchIdx >= 0 ? diacriticMatchIdx : null,
    rasmMatchAt: rasmMatchIdx >= 0 ? rasmMatchIdx : null,
  };
}

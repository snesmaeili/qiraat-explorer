// Deterministic diff engine for qiraat variants.
//
// Hard contract: this module NEVER mutates its inputs and NEVER manufactures
// Quranic text. It reads from VariantGroup records (which carry verbatim,
// sourced strings) and produces word-level differences between two riwayat
// for one verse.
//
// All normalisation is OPTIONAL and HAPPENS IN COPIES. The original text
// strings, including those returned in the diff result's baseText and
// compText fields, are the unmodified strings from the source data.

import { stripDiacritics, normalizeRasm } from './arabic.js';

/**
 * @typedef {Object} WordDiff
 * @property {number}             wordIndex
 * @property {string|null}        baseText
 * @property {string|null}        compText
 * @property {string}             category   vocalization | consonantal | word-form | orthographic | verse-numbering | unknown
 * @property {boolean}             isCurated
 * @property {Object|null}        variantGroup
 * @property {string}             confidence
 */

/**
 * Compare a verse across two riwayat using the verse's curated VariantGroup
 * data. The primary diff path; never invents text.
 */
export function diffByCuratedVariants(ayah, baseRiwayahId, comparisonRiwayahId) {
  if (!ayah) return [];
  if (baseRiwayahId === comparisonRiwayahId) return [];

  const out = [];
  const baseTokens = ayah.baseText?.tokens ?? [];

  for (const group of ayah.variants ?? []) {
    const baseReading = findReading(group, baseRiwayahId);
    const compReading = findReading(group, comparisonRiwayahId);

    if (!compReading) continue; // no sourced data for the comparison riwayah here

    let baseText;
    if (baseReading) {
      baseText = baseReading.text;
    } else if (baseRiwayahId === ayah.baseText?.riwayah) {
      baseText = baseTokens[group.wordIndex]?.text ?? null;
    } else {
      continue; // no sourced base text for this riwayah here -- skip
    }

    if (baseText === compReading.text) continue;

    const category = group.category ?? inferCategory(baseText, compReading.text);
    out.push({
      wordIndex: group.wordIndex,
      baseText,
      compText: compReading.text,
      category,
      isCurated: !!group.category,
      variantGroup: group,
      confidence: group.confidence ?? 'needs_review',
    });
  }

  out.sort((a, b) => a.wordIndex - b.wordIndex);
  return out;
}

/**
 * Compare two pre-tokenised verse texts position-by-position. Used when full
 * verse texts for both riwayat are available (e.g. after running fetcher).
 * Categorisation is automatic only.
 *
 * Inputs are read-only.
 */
export function diffByVerseTexts(baseVerse, compVerse, opts) {
  if (!baseVerse || !compVerse) return [];
  const matchByRasm = !(opts && opts.matchByRasm === false);
  const baseTokens = baseVerse.tokens ?? [];
  const compTokens = compVerse.tokens ?? [];
  const eq = matchByRasm
    ? (a, b) => normalizeRasm(a) === normalizeRasm(b)
    : (a, b) => a === b;

  const out = [];
  const n = Math.max(baseTokens.length, compTokens.length);
  for (let i = 0; i < n; i++) {
    const a = baseTokens[i] ? baseTokens[i].text : undefined;
    const b = compTokens[i] ? compTokens[i].text : undefined;
    if (a == null && b == null) continue;
    if (a == null || b == null) {
      out.push({
        wordIndex: i,
        baseText: a == null ? null : a,
        compText: b == null ? null : b,
        category: 'verse-numbering',
        isCurated: false,
        variantGroup: null,
        confidence: 'inferred',
      });
      continue;
    }
    if (eq(a, b)) continue;
    out.push({
      wordIndex: i,
      baseText: a,
      compText: b,
      category: inferCategory(a, b),
      isCurated: false,
      variantGroup: null,
      confidence: 'inferred',
    });
  }
  return out;
}

function findReading(group, riwayahId) {
  if (!group || !riwayahId) return null;
  return (group.readings || []).find((r) => r.riwayah === riwayahId) || null;
}

/**
 * Infer category from two text strings. Returns:
 *   consonantal  -- rasm-normalised forms differ (real letter change)
 *   vocalization -- same rasm AND same letters; only diacritics differ
 *   orthographic -- same rasm but bare letters differ (e.g. superscript convention)
 *   unknown      -- caller passed equal strings or null
 *
 * The richer categories ('word-form', 'verse-numbering') require human
 * judgement and are only ever set on curated VariantGroups.
 *
 * Pure: never modifies inputs.
 */
export function inferCategory(a, b) {
  if (a == null || b == null) return 'unknown';
  if (a === b) return 'unknown';
  const rA = normalizeRasm(a);
  const rB = normalizeRasm(b);
  if (rA !== rB) return 'consonantal';
  return stripDiacritics(a) === stripDiacritics(b)
    ? 'vocalization'
    : 'orthographic';
}

/** Freeze a verse text deeply. Idempotent. */
export function freezeVerseText(verseText) {
  if (!verseText) return verseText;
  Object.freeze(verseText);
  Object.freeze(verseText.tokens);
  for (const tok of verseText.tokens) Object.freeze(tok);
  return verseText;
}

/** Freeze a variant group and its readings. */
export function freezeVariantGroup(group) {
  if (!group) return group;
  Object.freeze(group);
  Object.freeze(group.readings);
  for (const r of group.readings) Object.freeze(r);
  if (group.citations) Object.freeze(group.citations);
  return group;
}

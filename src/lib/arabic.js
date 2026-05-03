// Arabic text utilities used across the app and tests. Pure, no DOM/React.

// Combining diacritics (harakat, tanwin, shadda, sukun, superscript alif,
// Qur'anic annotation signs).
const DIACRITIC_RANGES = [
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06ed],
];

export function isDiacritic(cp) {
  return DIACRITIC_RANGES.some(([a, b]) => cp >= a && cp <= b);
}

export function stripDiacritics(s) {
  let out = '';
  for (const ch of s) {
    if (!isDiacritic(ch.codePointAt(0))) out += ch;
  }
  return out;
}

/**
 * Normalize for "rasm" (consonantal skeleton) comparison.
 *
 * The Hafs Uthmānic typography represents some alifs and yāʾs as SUPERSCRIPT
 * marks rather than as full letters (e.g. مَٰلِكِ uses U+0670 to indicate the
 * long ā in "mālik"). For rasm comparison we treat those marks as PRESENT
 * alif/yāʾ so the famous Q 1:4 Hafs (with ٰ) vs Warsh (no ٰ) variant is
 * detected as a rasm difference.
 *
 * Steps:
 *   1. Promote superscript alif (U+0670) to regular alif (U+0627).
 *   2. Promote small high yāʾ (U+06E6) to regular yāʾ (U+064A).
 *   3. Drop remaining diacritics.
 *   4. Unify alif variants (ٱآأإ → ا).
 *   5. Drop tatweel and collapse whitespace.
 */
export function normalizeRasm(s) {
  const promoted = s
    .replace(/ٰ/g, 'ا') // ٰ → ا
    .replace(/ۦ/g, 'ي'); // ۦ → ي
  return stripDiacritics(promoted)
    .replace(/[ٱآأإ]/g, 'ا') // ٱآأإ → ا
    .replace(/ـ/g, '') // tatweel ـ
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a verse into words.
 */
export function tokenize(verse) {
  return verse.split(/\s+/).filter(Boolean);
}

/**
 * Classify the kind of difference between two word tokens.
 *   'rasm'      — consonantal skeleton differs
 *   'diacritic' — same skeleton, vowels/shadda/sukun differ
 *   'identical' — strings are byte-identical
 *
 * Note: "phonetic-only" variants (imāla, ishmām, idghām) cannot be detected
 * from string comparison alone because they share both rasm AND diacritics.
 * Those are tagged manually in the variant dataset (variant.type='phonetic').
 */
export function classifyDiff(a, b) {
  if (a == null || b == null) return 'rasm';
  if (a === b) return 'identical';
  const rA = normalizeRasm(a);
  const rB = normalizeRasm(b);
  if (rA !== rB) return 'rasm';
  return 'diacritic';
}

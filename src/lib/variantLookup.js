// Deprecated. Superseded by ./dataLoader.js and ./diff.js as of schema 2.0.
// Kept as a thin re-export so any external scripts keep working during the
// transition. New code should import from dataLoader / diff directly.

export {
  listSurahs,
  listRiwayat,
  getAyah as getVerse,
  listVersesWithVariants as listSampleVersesWithVariants,
} from './dataLoader.js';

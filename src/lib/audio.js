// Audio playback helpers. Constructs EveryAyah CDN URLs for verse-level
// recitation audio.
//
// EveryAyah hosts MP3s under a predictable path:
//   https://everyayah.com/data/{slug}/{paddedSurah}{paddedAyah}.mp3
// where surah and ayah are both 3-digit zero-padded and concatenated.
// Each reciter's slug is verified against the live CDN at the date noted
// in src/data/audioReciters.json _meta.verifiedAt.
//
// This module never fabricates audio content; it only constructs URL
// paths against a third-party CDN and lets the browser's <audio> element
// stream the file. If a reciter has no slug (e.g. Qālūn, which EveryAyah
// doesn't host), audioUrl returns null and callers render a disabled
// "audio not available" affordance.

import audioData from '../data/audioReciters.json';

const TEMPLATE = audioData._meta?.urlTemplate ??
  'https://everyayah.com/data/{slug}/{paddedSurah}{paddedAyah}.mp3';

function pad3(n) {
  return String(n).padStart(3, '0');
}

/**
 * Construct the audio URL for a given reciter + verse.
 * @param {Object|string} reciter  Reciter object (from audioReciters.json)
 *                                 or reciter id string.
 * @param {number} surah           1-based surah number.
 * @param {number} ayah            1-based ayah number.
 * @returns {string|null}          Full URL or null if no slug available.
 */
export function audioUrl(reciter, surah, ayah) {
  const r = typeof reciter === 'string' ? audioData.reciters[reciter] : reciter;
  if (!r || !r.slug) return null;
  if (typeof surah !== 'number' || typeof ayah !== 'number') return null;
  return TEMPLATE
    .replace('{slug}', r.slug)
    .replace('{paddedSurah}', pad3(surah))
    .replace('{paddedAyah}', pad3(ayah));
}

/**
 * Pick the best available reciter for a given riwāya. Prefers reciters
 * with `preferred: true`; falls back to the first available reciter for
 * that riwāya. Returns null if none.
 * @param {string} riwayahId  e.g. "hafs", "warsh", "qalun"
 * @returns {Object|null}
 */
export function firstAvailableReciter(riwayahId) {
  const all = Object.values(audioData.reciters || {});
  const forRiwayah = all.filter((r) => r.riwayah === riwayahId && r.slug);
  if (forRiwayah.length === 0) return null;
  return forRiwayah.find((r) => r.preferred) ?? forRiwayah[0];
}

/** All reciters available for the given riwāya. */
export function recitersFor(riwayahId) {
  return Object.values(audioData.reciters || {})
    .filter((r) => r.riwayah === riwayahId && r.slug);
}

/** EveryAyah attribution metadata for footer/about display. */
export const AUDIO_SOURCE = {
  label: audioData._meta?.source ?? 'EveryAyah.com',
  url: audioData._meta?.sourceUrl ?? 'https://everyayah.com/',
  license: audioData._meta?.license ?? '',
  recitationsIndex:
    audioData._meta?.recitationsIndex ?? 'https://everyayah.com/recitations_ayat.html',
};

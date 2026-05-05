// Audio playback helpers. Constructs streaming URLs for verse-level
// recitation audio from EveryAyah, plus surah-level audio from MP3Quran
// for riwāyas (Qālūn) where verse-level CDN files don't exist.
//
// EveryAyah path:
//   https://everyayah.com/data/{slug}/{paddedSurah}{paddedAyah}.mp3
//   - {slug} is verbatim (already includes any "warsh/..." prefix)
//   - one file per ayah (~50–500 KB)
//
// MP3Quran path:
//   {serverBase}{paddedSurah}.mp3
//   - {serverBase} ends with a slash and is taken from the manifest
//   - one file per *surah* (multi-MB), plays from the first ayah
//
// This module never fabricates audio; it only constructs URL strings
// against third-party CDNs and lets <audio> stream them.

import audioData from '../data/audioReciters.json';

function pad3(n) {
  return String(n).padStart(3, '0');
}

/**
 * Construct an audio URL for a given reciter + verse. Returns:
 *   { url, granularity }   where granularity is "ayah" or "surah",
 *   or null when no URL can be built (missing reciter, missing slug,
 *   non-numeric surah/ayah).
 *
 * Surah-level URLs ignore the ayah parameter — the caller is responsible
 * for surfacing that to the user (the AudioButton tooltip does this).
 */
export function audioUrlInfo(reciter, surah, ayah) {
  const r = typeof reciter === 'string' ? audioData.reciters[reciter] : reciter;
  if (!r) return null;
  if (typeof surah !== 'number') return null;

  if (r.source === 'mp3quran' && r.serverBase) {
    return {
      url: r.serverBase + pad3(surah) + '.mp3',
      granularity: 'surah',
    };
  }

  if (r.source === 'everyayah' && r.slug) {
    if (typeof ayah !== 'number') return null;
    return {
      url: 'https://everyayah.com/data/' + r.slug + '/' + pad3(surah) + pad3(ayah) + '.mp3',
      granularity: 'ayah',
    };
  }

  return null;
}

/** Convenience: just the URL string. */
export function audioUrl(reciter, surah, ayah) {
  const info = audioUrlInfo(reciter, surah, ayah);
  return info?.url ?? null;
}

/**
 * Pick the best available reciter for a given riwāya. Prefers reciters
 * with `preferred: true`; falls back to the first reciter with a usable
 * source (slug for everyayah, serverBase for mp3quran). Returns null if
 * none.
 */
export function firstAvailableReciter(riwayahId) {
  const all = Object.values(audioData.reciters || {});
  const usable = all.filter(
    (r) =>
      r.riwayah === riwayahId &&
      ((r.source === 'everyayah' && r.slug) ||
        (r.source === 'mp3quran' && r.serverBase)),
  );
  if (usable.length === 0) return null;
  return usable.find((r) => r.preferred) ?? usable[0];
}

/** All usable reciters for the given riwāya. */
export function recitersFor(riwayahId) {
  return Object.values(audioData.reciters || {}).filter(
    (r) =>
      r.riwayah === riwayahId &&
      ((r.source === 'everyayah' && r.slug) ||
        (r.source === 'mp3quran' && r.serverBase)),
  );
}

/** Source-level metadata for footer attribution display. */
export const AUDIO_SOURCES = audioData._meta?.sources ?? {};
export const AUDIO_VERIFIED_AT = audioData._meta?.verifiedAt ?? null;

/**
 * Backwards-compatible single-source AUDIO_SOURCE export. Returns the
 * metadata for whichever source the given reciter uses; falls back to
 * EveryAyah if no reciter is given (legacy behaviour for the test
 * fixtures and the README footer).
 */
export const AUDIO_SOURCE = AUDIO_SOURCES.everyayah ?? {
  label: 'EveryAyah.com',
  url: 'https://everyayah.com/',
};

/** Look up the source metadata for a reciter. */
export function audioSourceFor(reciter) {
  if (!reciter || !reciter.source) return AUDIO_SOURCE;
  return AUDIO_SOURCES[reciter.source] ?? AUDIO_SOURCE;
}

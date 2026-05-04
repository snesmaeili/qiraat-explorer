// Source corpus parsers.
//
// HARD CONTRACT:
//   - These parsers READ external Quran corpora that the user has obtained
//     under the upstream license. They never modify the Arabic text — they
//     trim only line endings, then return the verse text exactly as it
//     appears in the source file.
//   - "tokenize" splits on whitespace only. No diacritic normalisation, no
//     character substitution.
//   - If a JSON shape is unrecognised, the parser THROWS. We never guess
//     Arabic text or fabricate verse keys.
//
// Pure functions. No external dependencies.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * Parse a Tanzil-style line-per-ayah text file.
 *
 * Format: each non-empty line looks like
 *   "1|1|بسم الله الرحمن الرحيم"
 * with surah | ayah | verse-text separated by literal pipes. The verse
 * text is preserved EXACTLY (only the trailing CR/LF is stripped).
 *
 * @param {string} text  raw file contents (UTF-8 string)
 * @returns {Map<string, string>}  keyed by "S:A"
 */
export function parseTanzilLinePerAyah(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseTanzilLinePerAyah expects a string');
  }
  const out = new Map();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.length === 0) continue;
    if (line.startsWith('#')) continue; // header/license comments
    // Tanzil distributions sometimes include a trailing license blurb after
    // the data, separated by a blank line. We only accept lines matching the
    // strict surah|ayah|text shape.
    const m = line.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (!m) continue;
    const key = m[1] + ':' + m[2];
    out.set(key, m[3]); // VERBATIM — no trim, no normalisation
  }
  return out;
}

/**
 * Parse a KFGQPC-style JSON file. The KFGQPC distributions and their
 * mirrors come in several plausible shapes:
 *
 *   shape A: array of records with surah/ayah/text
 *     [ { "surah": 1, "ayah": 1, "text": "..." }, ... ]
 *     [ { "sura_no": 1, "aya_no": 1, "aya_text": "..." }, ... ]
 *     [ { "sora": 1, "aya_no": 1, "aya_text": "..." }, ... ]
 *
 *   shape B: flat object keyed by "S:A"
 *     { "1:1": "...", "1:2": "...", ... }
 *
 *   shape C: nested object keyed by surah, then ayah
 *     { "1": { "1": "...", "2": "..." }, ... }
 *
 * If the JSON doesn't fit any of those, we THROW. Better to fail loudly
 * than guess.
 *
 * @param {*} json  parsed JSON value
 * @returns {Map<string, string>}
 */
export function parseKfgqpcJson(json) {
  if (json == null) throw new Error('parseKfgqpcJson: input is null/undefined');
  // shape A: array
  if (Array.isArray(json)) {
    const out = new Map();
    for (const r of json) {
      const hasCanonicalFields =
        r != null &&
        (typeof r.surah === 'number' || typeof r.surah === 'string') &&
        (typeof r.ayah === 'number' || typeof r.ayah === 'string') &&
        typeof r.text === 'string';
      const hasKfgqpcFields =
        r != null &&
        (typeof r.sura_no === 'number' || typeof r.sura_no === 'string') &&
        (typeof r.aya_no === 'number' || typeof r.aya_no === 'string') &&
        typeof r.aya_text === 'string';
      const hasKfgqpcHafsFields =
        r != null &&
        (typeof r.sora === 'number' || typeof r.sora === 'string') &&
        (typeof r.aya_no === 'number' || typeof r.aya_no === 'string') &&
        typeof r.aya_text === 'string';

      if (hasCanonicalFields) {
        out.set(String(r.surah) + ':' + String(r.ayah), r.text);
      } else if (hasKfgqpcFields) {
        out.set(String(r.sura_no) + ':' + String(r.aya_no), r.aya_text);
      } else if (hasKfgqpcHafsFields) {
        out.set(String(r.sora) + ':' + String(r.aya_no), r.aya_text);
      } else {
        throw new Error(
          'parseKfgqpcJson: array entry missing surah/ayah/text, sura_no/aya_no/aya_text, or sora/aya_no/aya_text fields',
        );
      }
    }
    if (out.size === 0) {
      throw new Error('parseKfgqpcJson: array is empty');
    }
    return out;
  }
  // shape B / C: object
  if (typeof json === 'object') {
    const keys = Object.keys(json);
    if (keys.length === 0) {
      throw new Error('parseKfgqpcJson: object has no keys');
    }
    // shape B: flat "S:A" keys
    if (keys.every((k) => /^\d+:\d+$/.test(k))) {
      const out = new Map();
      for (const k of keys) {
        const v = json[k];
        if (typeof v !== 'string') {
          throw new Error(
            'parseKfgqpcJson: value for key "' + k + '" is not a string',
          );
        }
        out.set(k, v);
      }
      return out;
    }
    // shape C: nested
    const surahKeys = keys.filter((k) => /^\d+$/.test(k));
    if (surahKeys.length > 0 && surahKeys.length === keys.length) {
      const out = new Map();
      for (const s of surahKeys) {
        const ayat = json[s];
        if (typeof ayat !== 'object' || ayat == null) {
          throw new Error('parseKfgqpcJson: nested entry for surah ' + s + ' is not an object');
        }
        for (const a of Object.keys(ayat)) {
          if (!/^\d+$/.test(a)) {
            throw new Error('parseKfgqpcJson: nested ayah key "' + a + '" is not numeric');
          }
          const v = ayat[a];
          if (typeof v !== 'string') {
            throw new Error(
              'parseKfgqpcJson: value at ' + s + '.' + a + ' is not a string',
            );
          }
          out.set(s + ':' + a, v);
        }
      }
      return out;
    }
  }
  throw new Error(
    'parseKfgqpcJson: unrecognised shape — expected array of {surah,ayah,text}, ' +
      'array of {sura_no,aya_no,aya_text}, array of {sora,aya_no,aya_text}, flat "S:A" object, ' +
      'or nested {surah:{ayah:text}} object.',
  );
}

/**
 * Tokenise a source ayah string by whitespace ONLY. Returns an array of
 * tokens, no diacritic normalisation, no character substitution.
 *
 * @param {string} ayahText
 * @returns {string[]}
 */
export function tokenizeSourceAyah(ayahText) {
  if (typeof ayahText !== 'string') return [];
  return ayahText.split(/\s+/).filter((s) => s.length > 0);
}

/**
 * Load a single corpus from disk.
 *
 * @param {Object} manifestEntry  one entry from sourceManifest.sources
 * @param {string} rootDir        absolute path to the project root
 * @returns {Promise<{
 *   manifestKey: string,
 *   sourceId: string,
 *   riwayah: string,
 *   format: string,
 *   ayahs: Map<string,string>,
 *   fileHash: string,
 *   loadedAt: string,
 *   localPath: string,
 *   bytes: number,
 * }>}
 */
export async function loadLocalSourceCorpus(manifestEntry, rootDir) {
  if (!manifestEntry) throw new Error('loadLocalSourceCorpus: manifestEntry is required');
  if (!manifestEntry.localPath) throw new Error('loadLocalSourceCorpus: manifestEntry.localPath missing');

  const fullPath = resolve(rootDir, manifestEntry.localPath);
  const raw = await readFile(fullPath); // Buffer
  const fileHash = 'sha256:' + createHash('sha256').update(raw).digest('hex');
  const text = raw.toString('utf8');

  let ayahs;
  if (manifestEntry.format === 'tanzil-line-per-ayah') {
    ayahs = parseTanzilLinePerAyah(text);
  } else if (manifestEntry.format === 'kfgqpc-json') {
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(
        'loadLocalSourceCorpus: ' + fullPath + ' is not valid JSON: ' + e.message,
      );
    }
    ayahs = parseKfgqpcJson(json);
  } else {
    throw new Error(
      'loadLocalSourceCorpus: unsupported format "' + manifestEntry.format + '"',
    );
  }

  // Honour expectedHash if the manifest pins one. Accept both the bare-hex
  // form written by scripts/record-source-provenance.js and the explicit
  // "sha256:<hex>" form, so either convention works.
  if (manifestEntry.expectedHash) {
    const expectedNormalised = manifestEntry.expectedHash.startsWith('sha256:')
      ? manifestEntry.expectedHash
      : 'sha256:' + manifestEntry.expectedHash;
    if (expectedNormalised !== fileHash) {
      throw new Error(
        'loadLocalSourceCorpus: ' + fullPath + ' hash ' + fileHash +
          ' does not match expectedHash ' + manifestEntry.expectedHash,
      );
    }
  }

  return {
    manifestKey: manifestEntry.manifestKey ?? null,
    sourceId: manifestEntry.sourceId,
    riwayah: manifestEntry.riwayah,
    format: manifestEntry.format,
    ayahs,
    fileHash,
    loadedAt: new Date().toISOString(),
    localPath: fullPath,
    bytes: raw.length,
  };
}

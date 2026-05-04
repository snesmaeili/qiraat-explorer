#!/usr/bin/env node
/**
 * fetch-data.js — download raw qira'at corpora into scripts/_raw/
 *
 * Sources:
 *   - Tanzil Uthmānic Hafs ʿan ʿĀṣim text (per-verse plain text)
 *       https://tanzil.net/  (download requires accepting Tanzil terms;
 *       see README for license/attribution requirements)
 *   - King Fahd Glorious Qur'an Printing Complex (KFGQPC) JSON
 *       Mirrored at: https://github.com/thetruetruth/quran-data-kfgqpc
 *       Files used: warsh.json, qalun.json, hafs.json
 *
 * Usage:
 *   node scripts/fetch-data.js              # fetch core Hafs/KFGQPC sources
 *   node scripts/fetch-data.js --all        # fetch core + Corpus Coranicum helpers
 *   node scripts/fetch-data.js --warsh      # fetch only Warsh
 *
 * After fetching, run build-variants.js to produce src/data/fullVariants.json.
 *
 * NOTE: this script does NOT modify or generate any Qur'anic Arabic text. It
 *       writes the raw source bytes verbatim into scripts/_raw/ for downstream
 *       alignment.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, '_raw');
const CORE_SOURCE_KEYS = ['hafsTanzil', 'hafsKFQPC', 'warsh', 'qalun'];

/**
 * Source registry. Each entry is a (filename, url, [contentType]).
 *
 * For Tanzil, the canonical Uthmani per-line text is served from a download
 * gateway requiring acceptance of the license. To make this script runnable
 * without browser interaction, we rely on a publicly mirrored copy. If the
 * mirror is unavailable, follow the README instructions to download manually
 * from tanzil.net and place the file at scripts/_raw/quran-uthmani.txt.
 */
const SOURCES = {
  hafsTanzil: {
    file: 'quran-uthmani.txt',
    url: 'https://tanzil.net/pub/text/quran-uthmani.txt',
    description: 'Tanzil Uthmānic, Hafs ʿan ʿĀṣim — verse-per-line plain text',
    license: 'Tanzil Public License — attribution required (see README)',
    manual: true, // Tanzil requires browser-based license acceptance; see README
  },
  hafsKFQPC: {
    file: 'kfqpc-hafs.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/hafs/data/hafsData_v18.json',
    description: 'KFGQPC Hafs JSON (v18)',
  },
  warsh: {
    file: 'kfqpc-warsh.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/warsh/data/warshData_v10.json',
    description: 'KFGQPC Warsh ʿan Nāfiʿ JSON (v10)',
  },
  qalun: {
    file: 'kfqpc-qalun.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/qaloon/data/QaloonData_v10.json',
    description: 'KFGQPC Qālūn ʿan Nāfiʿ JSON (v10)',
  },
  quranVariants: {
    file: 'quran_variants.xml',
    url: 'https://raw.githubusercontent.com/telota/corpus-coranicum-tei/main/data/quran_variants/allvariants.xml',
    description: 'Corpus Coranicum TEI XML – allvariants (reader-keyed variant readings)',
  },
  quranVariantsReaders: {
    file: 'quran_variants_readers.xml',
    url: 'https://raw.githubusercontent.com/telota/corpus-coranicum-tei/main/data/quran_variants/reader.xml',
    description: 'Corpus Coranicum TEI XML – reader authority file',
  },
  quranVariantsSources: {
    file: 'quran_variants_sources.xml',
    url: 'https://raw.githubusercontent.com/telota/corpus-coranicum-tei/main/data/quran_variants/sources.xml',
    description: 'Corpus Coranicum TEI XML – sources authority file',
  },
  talmon: {
    file: 'quran_concordance_listing.json',
    url: 'https://api.github.com/repos/telota/corpus-coranicum-tei/contents/data/quran_concordance',
    description: 'Talmon concordance (quran_concordance) – directory listing for 114 per-sura XML files (word-level grammatical parse, Rafael Talmon)',
  },
  cairoQuran: {
    file: 'cairoquran.xml',
    url: 'https://raw.githubusercontent.com/telota/corpus-coranicum-tei/main/data/cairo_quran/cairoquran.xml',
    description: 'Corpus Coranicum 1924 Cairo edition of the Quran with EN/DE/FR translations (17 MB TEI XML)',
  },
  quranCommentary: {
    file: 'quran_commentary_listing.json',
    url: 'https://api.github.com/repos/telota/corpus-coranicum-tei/contents/data/quran_commentary',
    description: 'Corpus Coranicum chronological literary-critical commentary (directory listing → per-sura XML files)',
  },
  quranIntertexts: {
    file: 'quran_intertexts_listing.json',
    url: 'https://api.github.com/repos/telota/corpus-coranicum-tei/contents/data/quran_intertexts',
    description: 'Corpus Coranicum Late-Antique intertext parallels (directory listing → per-text XML files)',
  },
};

async function fetchOne(key) {
  const src = SOURCES[key];
  if (src.manual) {
    console.log(`skip ${src.file}  (manual download - see README)`);
    return null; // not an error, just skipped
  }
  const target = resolve(RAW_DIR, src.file);
  const urls = [src.url, src.fallbackUrl].filter(Boolean);
  let lastErr;
  for (const url of urls) {
    try {
      console.log(`-> ${src.file}  ${url}`);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(target, buf);
      console.log(`  ok ${(buf.length / 1024).toFixed(1)} KB -> ${target}`);
      return target;
    } catch (err) {
      lastErr = err;
      console.warn(`  x ${err.message}`);
    }
  }
  throw new Error(`All sources failed for ${key}: ${lastErr?.message}`);
}

async function main() {
  const argv = new Set(process.argv.slice(2));
  const wantAll = argv.has('--all');
  const keys = Object.keys(SOURCES).filter(
    (k) => (argv.size === 0 && CORE_SOURCE_KEYS.includes(k)) ||
      wantAll ||
      argv.has(`--${k.toLowerCase()}`),
  );

  if (!existsSync(RAW_DIR)) await mkdir(RAW_DIR, { recursive: true });

  const failed = [];
  const skipped = [];
  for (const k of keys) {
    try {
      const result = await fetchOne(k);
      if (result === null) skipped.push(k);
    } catch (e) {
      failed.push({ k, e });
    }
  }

  console.log('\n=== summary ===');
  for (const k of keys) {
    const f = failed.find((x) => x.k === k);
    const isSkipped = skipped.includes(k);
    const icon = f ? 'x' : isSkipped ? '-' : 'ok';
    const suffix = f ? '  - ' + f.e.message : isSkipped ? '  (manual)' : '';
    console.log(`${icon} ${k.padEnd(22)}  ${SOURCES[k].file}${suffix}`);
  }
  if (skipped.length) {
    console.log(
      `\n${skipped.length} source(s) require manual download (see README).`,
    );
  }
  if (failed.length) {
    console.error(
      `\n${failed.length} source(s) could not be fetched automatically.`,
    );
    process.exitCode = 1;
  } else {
    console.log('\nAll auto-fetchable sources retrieved. Next: node scripts/build-variants.js');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

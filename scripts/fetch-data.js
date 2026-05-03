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
 *   node scripts/fetch-data.js              # fetch all
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
    fallbackUrl:
      'https://raw.githubusercontent.com/risan/quran-json/main/dist/quran-uthmani.txt',
    description: 'Tanzil Uthmānic, Hafs ʿan ʿĀṣim — verse-per-line plain text',
    license: 'Tanzil Public License — attribution required (see README)',
  },
  hafsKFQPC: {
    file: 'kfqpc-hafs.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/hafs.json',
    description: 'KFGQPC Hafs JSON',
  },
  warsh: {
    file: 'kfqpc-warsh.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/warsh.json',
    description: 'KFGQPC Warsh ʿan Nāfiʿ JSON',
  },
  qalun: {
    file: 'kfqpc-qalun.json',
    url:
      'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/qalun.json',
    description: 'KFGQPC Qālūn ʿan Nāfiʿ JSON',
  },
};

async function fetchOne(key) {
  const src = SOURCES[key];
  const target = resolve(RAW_DIR, src.file);
  const urls = [src.url, src.fallbackUrl].filter(Boolean);
  let lastErr;
  for (const url of urls) {
    try {
      console.log(`→ ${src.file}  ${url}`);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(target, buf);
      console.log(`  ✓ ${(buf.length / 1024).toFixed(1)} KB → ${target}`);
      return target;
    } catch (err) {
      lastErr = err;
      console.warn(`  ✗ ${err.message}`);
    }
  }
  throw new Error(`All sources failed for ${key}: ${lastErr?.message}`);
}

async function main() {
  const argv = new Set(process.argv.slice(2));
  const wantAll = argv.size === 0 || argv.has('--all');
  const keys = Object.keys(SOURCES).filter(
    (k) => wantAll || argv.has(`--${k.toLowerCase()}`),
  );

  if (!existsSync(RAW_DIR)) await mkdir(RAW_DIR, { recursive: true });

  const failed = [];
  for (const k of keys) {
    try {
      await fetchOne(k);
    } catch (e) {
      failed.push({ k, e });
    }
  }

  console.log('\n=== summary ===');
  for (const k of keys) {
    const f = failed.find((x) => x.k === k);
    console.log(`${f ? '✗' : '✓'} ${k.padEnd(12)}  ${SOURCES[k].file}${f ? '  — ' + f.e.message : ''}`);
  }
  if (failed.length) {
    console.error(
      `\n${failed.length} source(s) could not be fetched automatically.`,
    );
    console.error(
      'See README "Manual data download" section. For Tanzil, you must accept ' +
        'the license at https://tanzil.net/download/ and save the file as ' +
        'scripts/_raw/quran-uthmani.txt.',
    );
    process.exitCode = 1;
  } else {
    console.log('\nAll sources fetched. Next: node scripts/build-variants.js');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

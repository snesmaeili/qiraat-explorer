#!/usr/bin/env node
/**
 * build-variants.js - align Hafs / Warsh / Qalun and emit fullVariants.json
 *
 * Pipeline:
 *   1. Read scripts/_raw/quran-uthmani.txt   (line-per-verse, "1|1|...")
 *   2. Read scripts/_raw/kfqpc-warsh.json    (verse keyed by "S:A")
 *   3. Read scripts/_raw/kfqpc-qalun.json
 *   4. Tokenize each verse on whitespace.
 *   5. Word-align using Needleman-Wunsch (rasm-aware) from src/lib.
 *   6. Classify each diff as rasm/diacritic/identical via classifyDiff.
 *   7. Emit src/data/fullVariants.json (same shape as sampleVariants.json).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stripDiacritics,
  normalizeRasm,
  tokenize,
  classifyDiff,
} from '../src/lib/arabic.js';
import { alignWords } from '../src/lib/alignment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(__dirname, '_raw');
const OUT = resolve(__dirname, '..', 'src', 'data', 'fullVariants.json');

function classifyDiffOrGap(a, b) {
  if (b == null) return 'omission';
  if (a == null) return 'insertion';
  return classifyDiff(a, b);
}

function riwayaLabel(id) {
  return (
    {
      hafs: 'Hafs an Asim',
      warsh: 'Warsh an Nafi',
      qalun: 'Qalun an Nafi',
    }[id] ?? id
  );
}

async function loadHafs() {
  const path = resolve(RAW, 'quran-uthmani.txt');
  const text = await readFile(path, 'utf8');
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (!m) continue;
    map[m[1] + ':' + m[2]] = m[3].trim();
  }
  return map;
}

async function loadKFQPC(file) {
  const path = resolve(RAW, file);
  const data = JSON.parse(await readFile(path, 'utf8'));
  if (Array.isArray(data)) {
    const map = {};
    for (const v of data) {
      if (v.surah && v.ayah && v.text) map[v.surah + ':' + v.ayah] = v.text;
    }
    return map;
  }
  if (data && typeof data === 'object') {
    const sample = Object.keys(data)[0];
    if (sample && /^\d+:\d+$/.test(sample)) return data;
    const map = {};
    for (const [s, ayat] of Object.entries(data)) {
      for (const [a, t] of Object.entries(ayat)) map[s + ':' + a] = t;
    }
    return map;
  }
  throw new Error('Unrecognized KFQPC shape in ' + file);
}

function detectVariants(hafsVerse, others) {
  const hafsTokens = tokenize(hafsVerse);
  const variants = [];
  for (const [riwaya, otherVerse] of Object.entries(others)) {
    if (!otherVerse) continue;
    const otherTokens = tokenize(otherVerse);
    const aligned = alignWords(hafsTokens, otherTokens);
    let hafsIdx = -1;
    for (const [h, o] of aligned) {
      if (h != null) hafsIdx++;
      if (h === o) continue;
      const wordIndex = h != null ? hafsIdx : Math.max(hafsIdx, 0);
      let entry = variants.find((v) => v.wordIndex === wordIndex);
      if (!entry) {
        entry = {
          wordIndex,
          type: classifyDiffOrGap(h, o),
          readings: [
            {
              riwaya: 'hafs',
              label: 'Hafs an Asim',
              text: h ?? '(omitted)',
              source: 'Tanzil Uthmanic',
            },
          ],
        };
        variants.push(entry);
      }
      if (!entry.readings.find((r) => r.riwaya === riwaya)) {
        entry.readings.push({
          riwaya,
          label: riwayaLabel(riwaya),
          text: o ?? '(omitted)',
          source: 'KFQPC ' + riwayaLabel(riwaya),
        });
      }
    }
  }
  return variants;
}

async function main() {
  if (!existsSync(RAW)) {
    console.error('No raw data. Run: node scripts/fetch-data.js');
    process.exit(1);
  }
  const hafs = await loadHafs();
  const warsh = await loadKFQPC('kfqpc-warsh.json').catch(() => ({}));
  const qalun = await loadKFQPC('kfqpc-qalun.json').catch(() => ({}));

  const verses = {};
  let withVariants = 0;
  for (const [key, hafsVerse] of Object.entries(hafs)) {
    const [s, a] = key.split(':').map(Number);
    const variants = detectVariants(hafsVerse, {
      warsh: warsh[key],
      qalun: qalun[key],
    });
    verses[key] = {
      surah: s,
      ayah: a,
      hafs: { tokens: tokenize(hafsVerse).map((t) => ({ text: t })) },
      variants,
    };
    if (variants.length) withVariants++;
  }

  const out = {
    _generatedAt: new Date().toISOString(),
    _generator: 'scripts/build-variants.js',
    _provenance:
      'Word-aligned diff of Tanzil Hafs vs KFQPC Warsh and Qalun. Hand-review recommended.',
    verses,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 0));
  console.log(
    'Wrote ' + OUT + '\nVerses: ' + Object.keys(verses).length +
      ', with variants: ' + withVariants,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

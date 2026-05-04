#!/usr/bin/env node
/**
 * Build a local complete Hafs browsing corpus for the UI.
 *
 * Input:  scripts/_raw/kfqpc-hafs.json
 * Output: src/data/hafsCorpusData.json
 *
 * The script copies upstream Hafs words from the local KFGQPC file and removes
 * only the printed verse-number marker at the end of each ayah for UI display.
 * It does not infer, translate, or generate Qur'anic Arabic text.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKfgqpcJson, tokenizeSourceAyah } from '../src/lib/sourceParsers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(__dirname, '_raw', 'kfqpc-hafs.json');
const OUT = resolve(__dirname, '..', 'src', 'data', 'hafsCorpusData.json');
const TRAILING_VERSE_NUMBER_RE = /[\s\u00a0]*[\u0660-\u0669\u06f0-\u06f9]+[\s\u00a0]*$/u;

function stripVerseNumber(text) {
  return text.replace(TRAILING_VERSE_NUMBER_RE, '').trim();
}

async function main() {
  if (!existsSync(RAW)) {
    throw new Error('Missing ' + RAW + '. Run npm run fetch-data first.');
  }

  const raw = JSON.parse(await readFile(RAW, 'utf8'));
  const parsed = parseKfgqpcJson(raw);
  const verses = {};

  for (const [key, sourceText] of parsed) {
    const [surah, ayah] = key.split(':').map(Number);
    const text = stripVerseNumber(sourceText);
    verses[key] = {
      surah,
      ayah,
      baseText: {
        riwayah: 'hafs',
        surah,
        ayah,
        tokens: tokenizeSourceAyah(text).map((token, index) => ({
          index,
          text: token,
        })),
        source: 'kfqpc-hafs',
        confidence: 'source_corpus',
      },
      variants: [],
    };
  }

  const out = {
    _meta: {
      schemaVersion: '1.0.0',
      generated: false,
      generationPolicy: 'no-arabic-text-generation',
      source: 'KFGQPC Hafs JSON local corpus',
      sourceFile: 'scripts/_raw/kfqpc-hafs.json',
      generatedAt: new Date().toISOString(),
    },
    sources: {
      'kfqpc-hafs': {
        id: 'kfqpc-hafs',
        label: "King Fahd Glorious Qur'an Printing Complex - Hafs",
        url: 'https://qurancomplex.gov.sa/',
        notes: 'Generated locally from scripts/_raw/kfqpc-hafs.json for complete UI browsing.',
      },
    },
    verses,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 0));
  console.log('Wrote ' + OUT + ' with ' + Object.keys(verses).length + ' ayahs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

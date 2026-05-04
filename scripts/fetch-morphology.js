#!/usr/bin/env node
/**
 * Build the small morphology comparison sample used by the prototype UI.
 *
 * The script copies Quranic surface forms from src/data/quranData.json by
 * verse/word index. It does not generate or rewrite Qur'anic text.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'src', 'data', 'morphologyData.json');
const QURAN_DATA = resolve(__dirname, '..', 'src', 'data', 'quranData.json');

const SAMPLE_COMPARISONS = {
  '1:4': [
    {
      wordIndex: 0,
      qac: { root: 'م ل ك', lemma: 'مَالِك', pos: 'N' },
      talmon: { root: 'م ل ك', lemma: 'مَالِك', pos: 'N' },
    },
    {
      wordIndex: 1,
      qac: { root: 'ي و م', lemma: 'يَوْم', pos: 'N' },
      talmon: { root: 'ي و م', lemma: 'يَوْم', pos: 'N' },
    },
    {
      wordIndex: 2,
      qac: { root: 'د ي ن', lemma: 'دِين', pos: 'N' },
      talmon: { root: 'د و ن', lemma: 'دِين', pos: 'N' },
    },
  ],
  '2:9': [
    {
      wordIndex: 5,
      qac: { root: 'خ د ع', lemma: 'خَادَعَ', pos: 'V' },
      talmon: { root: 'خ د ع', lemma: 'خَدَعَ', pos: 'V' },
    },
  ],
};

async function main() {
  console.log('Generating morphology comparison sample...');
  const quranData = JSON.parse(await readFile(QURAN_DATA, 'utf8'));

  const data = Object.fromEntries(
    Object.entries(SAMPLE_COMPARISONS).map(([verseKey, items]) => {
      const verse = quranData.verses?.[verseKey];
      const enriched = items.map((item) => ({
        ...item,
        arabic: verse?.baseText?.tokens?.[item.wordIndex]?.text ?? '',
      }));
      return [verseKey, enriched];
    }),
  );

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2));
  console.log('Wrote ' + OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

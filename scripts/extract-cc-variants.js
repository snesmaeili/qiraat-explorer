#!/usr/bin/env node
/**
 * Extract scholarly variant readings from the Corpus Coranicum TEI distribution
 * for the 8 verses currently in src/data/quranData.json. Output is an overlay
 * of reader-attributed transliterated readings — NOT Arabic text.
 *
 * Why no Arabic: the CC TEI distribution carries the transliteration in the
 * outer <w n="S:A:W">…</w> element; the inner <w xml:lang="ara"/> element is
 * self-closing in this dataset, so the Arabic surface forms are not present.
 * The integrity policy forbids us from inferring or synthesising Arabic from
 * the Latin transliteration, so we extract what is actually there.
 *
 * Output schema (src/data/ccVariants.json):
 *   {
 *     _meta: {...},
 *     verses: {
 *       "1:4": [
 *         {
 *           ccId: "variant_1167",
 *           readers: [{ id, display, formal }],
 *           sourceId: "12" | null,
 *           words: { "1": "mālika", "2": "yaumi", "3": "d-dīni" }
 *         },
 *         ...
 *       ],
 *       ...
 *     }
 *   }
 *
 * Inputs:
 *   scripts/_raw/quran_variants.xml          (~8.4 MB)
 *   scripts/_raw/quran_variants_readers.xml  (~1.2 MB)
 *
 * The script does not generate Arabic text. Transliteration strings are
 * copied verbatim from CC's TEI.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VARIANTS_XML = resolve(ROOT, 'scripts', '_raw', 'quran_variants.xml');
const READERS_XML = resolve(ROOT, 'scripts', '_raw', 'quran_variants_readers.xml');
const OUT = resolve(ROOT, 'src', 'data', 'ccVariants.json');

const CURATED_VERSES = new Set([
  '1:4', '1:6', '1:7', '2:9', '2:10', '2:132', '3:146', '5:6',
]);

function buildReaderMap(xml) {
  const map = new Map();
  const personRegex = /<person xml:id="variantsreader_(\d+)">([\s\S]*?)<\/person>/g;
  let m;
  while ((m = personRegex.exec(xml)) !== null) {
    const id = m[1];
    const body = m[2];
    const dispMatch = body.match(/<name type="display">([^<]+)<\/name>/);
    const mainMatch = body.match(/<name type="main">([^<]+)<\/name>/);
    const sigleMatch = body.match(/<note type="sigle">([^<]+)<\/note>/);
    const residenceMatch = body.match(/<residence>([^<]+)<\/residence>/);
    map.set(id, {
      id,
      display: dispMatch ? dispMatch[1].trim() : null,
      formal: mainMatch ? mainMatch[1].trim() : null,
      sigle: sigleMatch ? sigleMatch[1].trim() : null,
      residence: residenceMatch ? residenceMatch[1].trim() : null,
    });
  }
  return map;
}

function parseVariants(xml, readerMap) {
  const items = [];
  const itemRegex = /<item xml:id="(variant_\d+)">([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const ccId = m[1];
    const body = m[2];

    const readers = [];
    const readerKeyRegex = /<persName key="variantreader_(\d+)"[^>]*>([^<]+)<\/persName>/g;
    let r;
    while ((r = readerKeyRegex.exec(body)) !== null) {
      const id = r[1];
      const display = r[2].trim();
      const lookup = readerMap.get(id);
      readers.push({
        id,
        display,
        formal: lookup?.formal ?? null,
        sigle: lookup?.sigle ?? null,
        residence: lookup?.residence ?? null,
      });
    }

    const sourceMatch = body.match(/<title key="variantsource_(\d+)"/);
    const sourceId = sourceMatch ? sourceMatch[1] : null;

    const words = {};
    const wordRegex = /<w n="(\d{3}):(\d{3}):(\d{3})">([^<]+)/g;
    let w;
    while ((w = wordRegex.exec(body)) !== null) {
      const surah = parseInt(w[1], 10);
      const ayah = parseInt(w[2], 10);
      const word = parseInt(w[3], 10);
      const text = w[4].trim();
      words[`${surah}:${ayah}:${word}`] = text;
    }

    const verseKeysInItem = new Set(
      Object.keys(words).map((k) => k.split(':').slice(0, 2).join(':')),
    );
    const hasCurated = [...verseKeysInItem].some((v) => CURATED_VERSES.has(v));
    if (!hasCurated) continue;

    items.push({ ccId, readers, sourceId, words });
  }
  return items;
}

function groupByVerse(items) {
  const verses = {};
  for (const v of CURATED_VERSES) verses[v] = [];
  for (const item of items) {
    const wordsByVerse = {};
    for (const [wk, text] of Object.entries(item.words)) {
      const [s, a, w] = wk.split(':').map(Number);
      const verseKey = `${s}:${a}`;
      if (!CURATED_VERSES.has(verseKey)) continue;
      if (!wordsByVerse[verseKey]) wordsByVerse[verseKey] = {};
      wordsByVerse[verseKey][String(w)] = text;
    }
    for (const [verseKey, wordMap] of Object.entries(wordsByVerse)) {
      verses[verseKey].push({
        ccId: item.ccId,
        readers: item.readers,
        sourceId: item.sourceId,
        words: wordMap,
      });
    }
  }
  return verses;
}

async function main() {
  if (!existsSync(VARIANTS_XML) || !existsSync(READERS_XML)) {
    throw new Error(
      'Required CC TEI files missing under scripts/_raw/. ' +
      'Expected quran_variants.xml and quran_variants_readers.xml.',
    );
  }

  const variantsXml = await readFile(VARIANTS_XML, 'utf8');
  const readersXml = await readFile(READERS_XML, 'utf8');

  const readerMap = buildReaderMap(readersXml);
  const items = parseVariants(variantsXml, readerMap);
  const verses = groupByVerse(items);

  const out = {
    _meta: {
      schemaVersion: '1.0.0',
      source: 'Corpus Coranicum (Berlin-Brandenburgische Akademie der Wissenschaften)',
      sourceUrl: 'https://corpuscoranicum.de/',
      apiUrl: 'https://corpuscoranicum.de/api/xmltei/variants',
      extractedFrom: [
        'scripts/_raw/quran_variants.xml',
        'scripts/_raw/quran_variants_readers.xml',
      ],
      extractedAt: new Date().toISOString(),
      generated: false,
      generationPolicy: 'no-arabic-text-generation',
      containsArabicText: false,
      containsTransliteration: true,
      coverageNote:
        "Limited to the 8 verses currently in src/data/quranData.json. The CC TEI " +
        "distribution carries Latin transliteration with diacritics in <w n=...> " +
        "elements; the nested <w xml:lang=\"ara\"/> elements are self-closing in " +
        "this distribution, so Arabic surface forms are not present. This overlay " +
        "therefore documents reader attribution + transliteration only, and cannot " +
        "be byte-matched against quranData.json's Arabic.",
      curatedVerses: [...CURATED_VERSES],
      readerCount: readerMap.size,
      itemCount: items.length,
      licenseNote:
        'Academic project. Consult https://corpuscoranicum.de/ for terms of use ' +
        'before redistribution. Attribution to the Corpus Coranicum project ' +
        '(Berlin-Brandenburgische Akademie der Wissenschaften) is required.',
    },
    verses,
  };

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');

  console.log('Wrote ' + OUT);
  console.log('Readers indexed: ' + readerMap.size);
  console.log('Items touching curated verses: ' + items.length);
  console.log('Per-verse counts:');
  for (const [vk, vs] of Object.entries(verses)) {
    console.log('  Q ' + vk + ': ' + vs.length + ' CC variant entries');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

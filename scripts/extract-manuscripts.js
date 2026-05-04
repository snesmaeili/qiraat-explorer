#!/usr/bin/env node
/**
 * extract-manuscripts.js
 * 
 * Extracts C-14 dates, dimensions, and image links from manuscript prose summaries.
 * Generates src/data/manuscriptsData.json.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'src', 'data', 'manuscriptsData.json');

// Regex Extractors
const REGEX_C14 = /(?:C-?14|14C|radiocarbon)[^0-9]{0,80}(\d{3,4})\s*(?:-|to|–|—)\s*(\d{3,4})\s*CE/i;
const REGEX_DIMENSIONS = /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(cm|mm)/i;
const REGEX_IMAGE = /(?:image(?:\s+link)?|link):\s*(https?:\/\/[^\s]+)/i;

function parseProse(id, text) {
  const c14Match = text.match(REGEX_C14);
  const dimMatch = text.match(REGEX_DIMENSIONS);
  const imgMatch = text.match(REGEX_IMAGE);

  let c14Start = null;
  let c14End = null;
  let centerDate = null;

  if (c14Match) {
    c14Start = parseInt(c14Match[1], 10);
    c14End = parseInt(c14Match[2], 10);
    centerDate = Math.round((c14Start + c14End) / 2);
  }

  return {
    id,
    prose: text,
    extracted: {
      c14: c14Match ? { start: c14Start, end: c14End, center: centerDate } : null,
      dimensions: dimMatch ? `${dimMatch[1]} x ${dimMatch[2]} ${dimMatch[3]}` : null,
      imageUrl: imgMatch ? imgMatch[1] : null,
    }
  };
}

async function main() {
  console.log('Generating sample manuscript prose data for extraction...');

  // Sample input data representing typical catalogue prose.
  const rawSummaries = [
    {
      id: "Parisino-petropolitanus",
      text: "The Codex Parisino-petropolitanus is one of the oldest surviving manuscripts of the Quran. C-14 dating puts it at: 632 - 650 CE. It has impressive dimensions measuring approximately 33.0 x 24.0 cm. Image link: https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Codex_Parisino-petropolitanus.jpg/300px-Codex_Parisino-petropolitanus.jpg"
    },
    {
      id: "Birmingham Quran Manuscript",
      text: "Held at the University of Birmingham, this fragment consists of two parchment leaves. 14C-dated to 568 to 645 CE. The physical dimensions are 34.3 x 25.8 cm. Link: https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Birmingham_Quran_manuscript.jpg/300px-Birmingham_Quran_manuscript.jpg"
    },
    {
      id: "Sanaa Manuscript",
      text: "A palimpsest discovered in the Great Mosque of Sana'a. The lower text C-14 analysis yields a date of 578-669 CE. The manuscript pages are roughly 36 x 28 cm. Image: https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Sanaa_manuscript.jpg/300px-Sanaa_manuscript.jpg"
    },
    {
      id: "Topkapi Manuscript",
      text: "Housed in the Topkapi Palace Museum, Istanbul. Often attributed to Uthman, though C-14 dating suggests: 640 - 700 CE. Massive dimensions of 41 x 46 cm. No image available currently."
    }
  ];

  const processed = rawSummaries.map(s => parseProse(s.id, s.text)).filter(m => m.extracted.c14);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(processed, null, 2));
  console.log('Extracted and wrote ' + OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

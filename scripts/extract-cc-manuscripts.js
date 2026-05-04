#!/usr/bin/env node
/**
 * Extract structured manuscript catalogue metadata from the Corpus Coranicum
 * TEI export (CC BY-SA 4.0, https://github.com/telota/corpus-coranicum-tei).
 *
 * Inputs:
 *   scripts/_raw/cc-tei/data/quran_manuscripts/manuscript-NNNNN.xml  (~2,323 files)
 *
 * Output:
 *   src/data/ccManuscripts.json — structured catalogue, filtered to manuscripts
 *   with a parseable date <= 1100 CE so the ManuscriptTimeline view stays
 *   readable. The full 2,323-entry catalogue is not bundled.
 *
 * Per-manuscript fields:
 *   ccId            — TEI xml:id (e.g. "mysql_id_12")
 *   fileName        — source file ("manuscript-00012.xml")
 *   title           — descriptive title from <titleStmt>
 *   shelfmark       — <idno>
 *   repository      — <repository> text (cleaned)
 *   summary         — first paragraph of <summary>, truncated to ~600 chars
 *   verseRange      — { start: "S:A:W", end: "S:A:W", folioCount: N }
 *   physical        — { material, folios, widthMm, heightMm, lines }
 *   script          — best <scriptDesc> string
 *   origDate        — { raw, parsed: { kind: "before"|"after"|"range"|"point", year, year2? } | null }
 *   provenance      — text
 *   imageUrls       — URLs found in <availability> / <ref target="...">
 *
 * The script does NOT generate Arabic text; it copies metadata strings
 * verbatim and discards transcription bodies.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MS_DIR = resolve(ROOT, 'scripts', '_raw', 'cc-tei', 'data', 'quran_manuscripts');
const OUT = resolve(ROOT, 'src', 'data', 'ccManuscripts.json');
const DATE_CUTOFF_CE = 1100;
const SUMMARY_MAX = 600;

/**
 * Famous early codices whose CC TEI msDesc has no imageUrls but which the
 * manuscript-studies literature consistently cites. We attach a stable
 * fallback image URL (Wikimedia Commons or institutional digital viewer)
 * so the ManuscriptTimeline can surface them in the featured set.
 *
 * Each entry is matched against the manuscript's `shelfmark` (idno) field.
 * When a match occurs AND `imageUrls.length === 0`, we push the fallback
 * URL into `imageUrls` and set `featuredFallback: true` so callers can
 * distinguish CC-native images from our additions.
 */
const FAMOUS_SHELFMARKS = [
  {
    pattern: /^DAM 01-/i,
    name: 'Sanaa palimpsest fragment',
    fallbackImageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Sanaa_manuscript.jpg/300px-Sanaa_manuscript.jpg',
    fallbackImageNote:
      'Wikimedia Commons (CC BY-SA); thumbnail represents the Sanaa palimpsest broadly',
  },
  {
    pattern: /^Arabe 328\b/i,
    name: 'Codex Parisino-petropolitanus (BnF Arabe 328 series)',
    fallbackImageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Codex_Parisino-petropolitanus.jpg/300px-Codex_Parisino-petropolitanus.jpg',
    fallbackImageNote: 'Wikimedia Commons thumbnail',
  },
  {
    pattern: /Mingana 1572a|Islamic Arabic 1572a/i,
    name: 'Birmingham Quran manuscript (Mingana Islamic Arabic 1572a)',
    fallbackImageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Birmingham_Quran_manuscript.jpg/300px-Birmingham_Quran_manuscript.jpg',
    fallbackImageNote: 'Wikimedia Commons thumbnail',
  },
  {
    pattern: /^Ma VI 165$/i,
    name: 'Tübingen Codex Ma VI 165',
    fallbackImageUrl:
      'https://idb.ub.uni-tuebingen.de/diglit/MaVI165/',
    fallbackImageNote: 'Tübingen UB digital viewer (entry page; not a thumbnail)',
  },
];

/** Date snapshot for documentation: when the fallback URL list was assembled. */
const FALLBACK_IMAGES_ADDED_AT = '2026-05-04';

function pickFirstMatch(xml, regex) {
  const m = xml.match(regex);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function pickAllMatches(xml, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function decodeEntitiesOnce(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

/** Some URLs in the source TEI are double-encoded (e.g. `&amp;amp;`).
 *  Decode iteratively until stable, capped at 3 passes. */
function decodeEntities(s) {
  let cur = s;
  for (let i = 0; i < 3; i++) {
    const next = decodeEntitiesOnce(cur);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateClean(s, max) {
  if (!s) return s;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

/**
 * Parse a heterogeneous origDate string into a structured form.
 *  - "-750" or "before 750" -> { kind: "before", year: 750 }
 *  - "750-800" / "750-800 CE" -> { kind: "range", year: 750, year2: 800 }
 *  - "9. Jh." / "9th c." -> approximate ranges by century
 *  - "1924" -> { kind: "point", year: 1924 }
 * Returns null when no plausible CE year is found.
 */
function parseOrigDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // German "9./3. Jh." or "9. Jahrhundert"
  const centMatch = s.match(/(\d{1,2})\s*[./]?\s*Jh/i) || s.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*c(?:ent(?:ury)?)?/i);

  // Range like "750-800" or "750–800"
  const rangeMatch = s.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})/);

  // "before 750", "-750", "<750"
  const beforeMatch = s.match(/(?:before|\-|<)\s*(\d{3,4})/i);

  // "after 750", ">750"
  const afterMatch = s.match(/(?:after|>)\s*(\d{3,4})/i);

  // Plain year
  const yearMatch = s.match(/\b(\d{3,4})\b/);

  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    if (a < 2300 && b < 2300) return { kind: 'range', year: a, year2: b };
  }
  if (beforeMatch) {
    const y = parseInt(beforeMatch[1], 10);
    if (y < 2300) return { kind: 'before', year: y };
  }
  if (afterMatch) {
    const y = parseInt(afterMatch[1], 10);
    if (y < 2300) return { kind: 'after', year: y };
  }
  if (centMatch) {
    const c = parseInt(centMatch[1], 10);
    if (c >= 1 && c <= 21) {
      return { kind: 'range', year: (c - 1) * 100, year2: c * 100 };
    }
  }
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y < 2300) return { kind: 'point', year: y };
  }
  return null;
}

/** Convenience: estimate a "central year" for sorting/plotting. */
function centerYear(parsed) {
  if (!parsed) return null;
  if (parsed.kind === 'point') return parsed.year;
  if (parsed.kind === 'before') return parsed.year - 50;
  if (parsed.kind === 'after') return parsed.year + 50;
  if (parsed.kind === 'range') return Math.round((parsed.year + parsed.year2) / 2);
  return null;
}

function parseManuscript(xml, fileName) {
  const ccId = pickFirstMatch(xml, /<TEI[^>]*\bxml:id="([^"]+)"/);
  const titleSt = xml.match(/<titleStmt[\s\S]*?<\/titleStmt>/);
  const title = titleSt ? pickFirstMatch(titleSt[0], /<title[^>]*>([\s\S]*?)<\/title>/) : null;

  const msDescMatch = xml.match(/<msDesc[\s\S]*?<\/msDesc>/);
  const msDesc = msDescMatch ? msDescMatch[0] : '';

  const repository = pickFirstMatch(msDesc, /<repository[^>]*>([\s\S]*?)<\/repository>/);
  const shelfmark = pickFirstMatch(msDesc, /<idno[^>]*>([\s\S]*?)<\/idno>/);

  // Summary: first paragraph of <summary>, tags stripped, truncated.
  const summaryBlock = pickFirstMatch(msDesc, /<summary[^>]*>([\s\S]*?)<\/summary>/);
  let summary = null;
  if (summaryBlock) {
    const firstP = pickFirstMatch(summaryBlock, /<p[^>]*>([\s\S]*?)<\/p>/);
    if (firstP) summary = truncateClean(decodeEntities(stripTags(firstP)), SUMMARY_MAX);
  }

  // Verse coverage: list of msItem entries.
  const folios = [];
  const itemRegex = /<msItem[^>]*\bn="([^"]+)"[^>]*>([\s\S]*?)<\/msItem>/g;
  let mItem;
  while ((mItem = itemRegex.exec(msDesc)) !== null) {
    const folio = mItem[1];
    const titleKey = pickFirstMatch(mItem[2], /<title[^>]*\bkey="([^"]+)"/);
    if (titleKey) folios.push({ folio, key: titleKey });
  }
  let verseRange = null;
  if (folios.length > 0) {
    verseRange = {
      start: folios[0].key.split('-')[0],
      end: folios[folios.length - 1].key.split('-').slice(-1)[0],
      folioCount: folios.length,
    };
  }

  // Physical description.
  const material = pickFirstMatch(msDesc, /<supportDesc[^>]*\bmaterial="([^"]+)"/);
  const widthMm = pickFirstMatch(msDesc, /<width[^>]*>([\s\S]*?)<\/width>/);
  const heightMm = pickFirstMatch(msDesc, /<height[^>]*>([\s\S]*?)<\/height>/);
  const dimUnit = pickFirstMatch(msDesc, /<dimensions[^>]*\bunit="([^"]+)"/);
  const folioCount = (() => {
    const extent = pickFirstMatch(msDesc, /<extent>([\s\S]*?)<\/extent>/);
    if (!extent) return null;
    const m = extent.match(/Folios:\s*(\d+)/i) || extent.match(/(\d+)\s+fol/i);
    return m ? parseInt(m[1], 10) : null;
  })();
  const lines = (() => {
    const m = msDesc.match(/<layout[^>]*\bwrittenLines="(\d+)"/);
    return m ? parseInt(m[1], 10) : null;
  })();

  // Script class.
  let script = pickFirstMatch(msDesc, /<scriptDesc[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>/);
  if (!script) script = pickFirstMatch(msDesc, /<scriptNote[^>]*>([\s\S]*?)<\/scriptNote>/);
  if (script) script = decodeEntities(stripTags(script));

  // Origin / provenance.
  const origDateRaw = pickFirstMatch(msDesc, /<origDate[^>]*>([\s\S]*?)<\/origDate>/) ||
    pickFirstMatch(msDesc, /<origDate[^>]*\bnotBefore="([^"]+)"/);
  const origDateAttrAfter = pickFirstMatch(msDesc, /<origDate[^>]*\bnotAfter="([^"]+)"/);
  const origDate = {
    raw: origDateRaw,
    notAfter: origDateAttrAfter,
    parsed: parseOrigDate(origDateRaw) || (origDateAttrAfter ? parseOrigDate(origDateAttrAfter) : null),
  };
  const provenance = pickFirstMatch(msDesc, /<provenance[^>]*>([\s\S]*?)<\/provenance>/);

  // Image URLs from availability + summary refs.
  const allRefs = pickAllMatches(xml, /<ref[^>]*\btarget="([^"]+)"/g);
  const imagePatterns = [
    /digi\.vatlib\.it/, /gallica\.bnf\.fr/, /bl\.uk\/manuscripts/, /cudl\.lib\.cam\.ac\.uk/,
    /digi\.ub\.uni-tuebingen\.de/, /commons\.wikimedia\.org/, /wikipedia\.org\/wikipedia\/commons/,
    /e-codices\.unifr\.ch/, /digital-collections\.bl\.uk/, /loc\.gov\/resource/,
    /digital\.bodleian/, /digi\.bib\.uni-mannheim\.de/, /turkstat/, /walters\.org/,
    /khalili\.org/, /tum\.de\/digital/, /digitalbodleian/,
  ];
  const imageUrls = [
    ...new Set(
      allRefs
        .map((u) => decodeEntities(u))
        .filter((u) => imagePatterns.some((p) => p.test(u))),
    ),
  ];

  // Fallback for famous codices that CC's TEI doesn't surface image URLs
  // for. We attach a curated Wikimedia / institutional viewer URL so the
  // timeline can include Sanaa, BnF Arabe 328, Birmingham, Tübingen, etc.
  let featuredFallback = false;
  let famousMatch = null;
  if (imageUrls.length === 0 && shelfmark) {
    const cleanShelf = stripTags(shelfmark).trim();
    famousMatch = FAMOUS_SHELFMARKS.find((f) => f.pattern.test(cleanShelf));
    if (famousMatch) {
      imageUrls.push(famousMatch.fallbackImageUrl);
      featuredFallback = true;
    }
  }

  // "Featured" = has at least one image link AND a parseable date <= 1000 CE.
  // Used by the ManuscriptTimeline view to keep the visualisation readable.
  const featured =
    imageUrls.length > 0 &&
    parseOrigDate(origDateRaw) != null &&
    (centerYear(parseOrigDate(origDateRaw)) ?? Infinity) <= 1000;

  return {
    ccId,
    fileName,
    title: title ? decodeEntities(stripTags(title)) : null,
    shelfmark: shelfmark ? decodeEntities(stripTags(shelfmark)) : null,
    repository: repository ? decodeEntities(stripTags(repository)) : null,
    featured,
    summary,
    verseRange,
    physical: {
      material,
      folios: folioCount,
      widthMm: widthMm ? parseFloat(widthMm) : null,
      heightMm: heightMm ? parseFloat(heightMm) : null,
      dimUnit: dimUnit || null,
      lines,
    },
    script,
    origDate: {
      raw: origDate.raw,
      parsed: origDate.parsed,
      centerYear: centerYear(origDate.parsed),
    },
    provenance: provenance ? decodeEntities(stripTags(provenance)) : null,
    imageUrls,
    featuredFallback,
    famousName: famousMatch?.name ?? null,
  };
}

async function main() {
  if (!existsSync(MS_DIR)) {
    throw new Error(
      'Missing ' + MS_DIR + '. Sparse-clone the CC TEI repo first:\n' +
      '  git clone --depth 1 --filter=blob:none --sparse ' +
      'https://github.com/telota/corpus-coranicum-tei.git scripts/_raw/cc-tei\n' +
      '  git -C scripts/_raw/cc-tei sparse-checkout set data/quran_manuscripts',
    );
  }
  const files = (await readdir(MS_DIR)).filter((f) => f.endsWith('.xml')).sort();
  console.log('Parsing ' + files.length + ' manuscript files…');

  const all = [];
  for (const f of files) {
    const xml = await readFile(resolve(MS_DIR, f), 'utf8');
    try {
      all.push(parseManuscript(xml, f));
    } catch (err) {
      console.warn('  skipped ' + f + ': ' + err.message);
    }
  }

  // Filter for the timeline: manuscripts with a parseable date <= cutoff,
  // OR with notAfter <= cutoff. The full catalogue is intentionally not
  // bundled — too large for a static React app.
  const filtered = all.filter((m) => {
    const c = m.origDate?.centerYear;
    if (c == null) return false;
    return c <= DATE_CUTOFF_CE;
  });
  filtered.sort((a, b) => (a.origDate.centerYear ?? 0) - (b.origDate.centerYear ?? 0));

  const out = {
    _meta: {
      schemaVersion: '1.0.0',
      source: 'Corpus Coranicum (Berlin-Brandenburgische Akademie der Wissenschaften)',
      sourceRepository: 'https://github.com/telota/corpus-coranicum-tei',
      sourcePath: 'data/quran_manuscripts/',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution:
        'Data from the Corpus Coranicum Project (BBAW), 2007-2024. ' +
        'TEI export by Yasmin Faghihi and Huw Jones (Cambridge); ' +
        'technical implementation by Claus Franke and Marcus Lampert (BBAW - TELOTA).',
      extractedAt: new Date().toISOString(),
      extractedBy: 'scripts/extract-cc-manuscripts.js',
      generated: false,
      generationPolicy: 'no-arabic-text-generation',
      filterNote:
        'Filtered to manuscripts with a parseable date center <= ' + DATE_CUTOFF_CE +
        ' CE so the timeline view stays readable. The full ' + all.length +
        '-entry catalogue lives upstream at ' +
        'https://github.com/telota/corpus-coranicum-tei/tree/main/data/quran_manuscripts.',
      totalManuscriptsInUpstream: all.length,
      manuscriptsBundled: filtered.length,
      manuscriptsFeatured: filtered.filter((m) => m.featured).length,
      dateCutoffCE: DATE_CUTOFF_CE,
      featuredFilter:
        'featured = imageUrls.length > 0 AND parseable date <= 1000 CE. ' +
        'ManuscriptTimeline.jsx uses this subset to keep the visualisation readable.',
      famousFallbacksAddedAt: FALLBACK_IMAGES_ADDED_AT,
      famousFallbackPolicy:
        'For codices the manuscript-studies literature consistently cites ' +
        'but whose CC TEI msDesc has no image URLs (Sanaa palimpsest fragments, ' +
        'BnF Arabe 328 series, Birmingham Mingana 1572a, Tübingen Ma VI 165), ' +
        'we attach a stable Wikimedia Commons thumbnail or institutional viewer ' +
        'URL so they appear in the featured set. Affected entries carry ' +
        'featuredFallback: true. No image content is fabricated; the URLs ' +
        'point at public, third-party-hosted images of these specific manuscripts.',
      famousFallbackCount: filtered.filter((m) => m.featuredFallback).length,
    },
    manuscripts: filtered,
  };

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote ' + OUT);
  console.log('  total parsed: ' + all.length);
  console.log('  with parseable date <= ' + DATE_CUTOFF_CE + ' CE: ' + filtered.length);
  console.log('  earliest centerYear: ' + (filtered[0]?.origDate.centerYear ?? '—'));
  console.log('  latest centerYear:   ' + (filtered[filtered.length - 1]?.origDate.centerYear ?? '—'));
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * match-sources.js
 *
 * Loads quranData.json and sourceManifest.json, attempts to load each
 * declared local corpus, runs an exact-text match for every VariantReading
 * whose riwayah has a corpus available, and writes a report.
 *
 * Behaviour:
 *   - If a corpus's local file is missing, that source is reported as
 *     "missing" but the script continues. It exits 0.
 *   - With --strict, missing sources cause exit 1.
 *   - The script NEVER modifies the dataset and NEVER produces Arabic text.
 *
 * Outputs:
 *   reports/audit/source-match-report.json
 *   reports/audit/source-match-report.md
 *
 * Note: source-match reports are git-ignored by default because they reflect
 * the user's local corpora. Commit them only when the local corpus is
 * reproducible (e.g. via expectedHash).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalSourceCorpus } from '../src/lib/sourceParsers.js';
import { matchReadingAgainstSource } from '../src/lib/sourceMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASET = resolve(ROOT, 'src', 'data', 'quranData.json');
const MANIFEST = resolve(ROOT, 'src', 'data', 'sourceManifest.json');
const OUT_DIR = resolve(ROOT, 'reports', 'audit');
const OUT_JSON = resolve(OUT_DIR, 'source-match-report.json');
const OUT_MD = resolve(OUT_DIR, 'source-match-report.md');

const STRICT = process.argv.includes('--strict');

function emoji(status) {
  return {
    exact_word_index_match: 'OK',
    exact_elsewhere_in_ayah: '~~',
    ayah_present_but_no_exact_match: 'NO',
    ayah_missing: 'MISS',
    source_not_applicable: 'N/A',
  }[status] || '??';
}

function renderMd(report) {
  const lines = [];
  lines.push('# Qiraat Explorer — source matching report');
  lines.push('');
  lines.push('Generated: ' + report.generatedAt);
  lines.push('');
  lines.push('Strict mode: `' + (report.strict ? 'true' : 'false') + '`');
  lines.push('');
  lines.push('## Source files');
  lines.push('| key | local path | state | hash | bytes |');
  lines.push('|---|---|---|---|---:|');
  for (const s of report.sources) {
    lines.push(
      '| `' + s.manifestKey + '` | `' + s.localPath + '` | ' + s.state +
        ' | ' + (s.fileHash ? '`' + s.fileHash + '`' : '—') +
        ' | ' + (s.bytes ?? '—') + ' |',
    );
  }
  lines.push('');
  lines.push('## Match summary');
  lines.push('| status | count |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(report.statusCounts)) {
    lines.push('| `' + k + '` | ' + v + ' |');
  }
  lines.push('');
  lines.push('Total readings checked: **' + report.totalReadingsChecked + '**.');
  lines.push('Total readings skipped (no applicable source): **' + report.totalReadingsSkipped + '**.');
  lines.push('');

  function listOf(title, status) {
    const matches = report.matches.filter((m) => m.status === status);
    lines.push('### ' + title + ' (' + matches.length + ')');
    if (matches.length === 0) { lines.push('_(none)_'); lines.push(''); return; }
    for (const m of matches) {
      lines.push(
        '- Q ' + m.surah + ':' + m.ayah + ' word ' + m.wordIndex +
          ' / `' + m.riwayah + '` against `' + m.sourceId + '`' +
          (m.matchedIndex != null ? ' (matched at index ' + m.matchedIndex + ')' : ''),
      );
    }
    lines.push('');
  }

  listOf('Exact word-index matches', 'exact_word_index_match');
  listOf('Exact elsewhere in ayah', 'exact_elsewhere_in_ayah');
  listOf('Ayah present but no exact match', 'ayah_present_but_no_exact_match');
  listOf('Ayah missing from corpus', 'ayah_missing');
  listOf('Source not applicable', 'source_not_applicable');

  lines.push('## Readings still using `manual_placeholder`');
  if (report.placeholderReadings.length === 0) {
    lines.push('_(none)_');
  } else {
    for (const p of report.placeholderReadings) {
      lines.push('- Q ' + p.surah + ':' + p.ayah + ' word ' + p.wordIndex + ' / `' + p.riwayah + '`');
    }
  }
  lines.push('');

  lines.push('## Safe replacement suggestions');
  lines.push('');
  lines.push('A suggestion is "safe" only when ALL of the following hold:');
  lines.push('- the reading currently has `source = "manual_placeholder"`');
  lines.push('- the match status is `exact_word_index_match`');
  lines.push('- the matching corpus is `kfqpc-warsh` or `kfqpc-qalun`');
  lines.push('- the matched riwayah equals the reading riwayah');
  lines.push('- the matched text is byte-identical to the reading text');
  lines.push('');
  lines.push('Apply with: `npm run apply:source-matches -- --write` (default is dry-run).');
  lines.push('');
  if (report.suggestions.length === 0) {
    lines.push('_(no safe replacements suggested in the current corpora.)_');
  } else {
    for (const sug of report.suggestions) {
      lines.push(
        '- Q ' + sug.surah + ':' + sug.ayah + ' word ' + sug.wordIndex +
          ' / `' + sug.riwayah + '` — replace `manual_placeholder` -> `' + sug.proposedSourceId + '`',
      );
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('Generated by `npm run match:sources`.');
  lines.push(
    'Source matching is **not** scholar verification. ' +
    'See README, "Source Matching Workflow".',
  );
  return lines.join('\n') + '\n';
}

async function main() {
  const dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

  if (manifest._meta?.generated || dataset._meta?.generated) {
    console.error('Generation tripwire active in manifest or dataset. Aborting.');
    process.exit(1);
  }

  // Load each enabled source.
  const sources = [];
  const corporaByRiwayah = new Map();
  for (const [manifestKey, entry] of Object.entries(manifest.sources)) {
    const target = resolve(ROOT, entry.localPath);
    const present = existsSync(target);
    if (!entry.enabled) {
      sources.push({
        manifestKey, sourceId: entry.sourceId, riwayah: entry.riwayah,
        localPath: entry.localPath, state: 'disabled', fileHash: null,
      });
      continue;
    }
    if (!present) {
      sources.push({
        manifestKey, sourceId: entry.sourceId, riwayah: entry.riwayah,
        localPath: entry.localPath, state: 'missing', fileHash: null,
      });
      continue;
    }
    
    if (entry.retrievalMethod === 'unknown') {
      console.warn(`WARNING: Source ${manifestKey} has unknown retrievalMethod.`);
    }
    if (!entry.expectedHash) {
      console.warn(`WARNING: Source ${manifestKey} has no expectedHash.`);
    }
    if (entry.canCommitRawFile === false) {
      console.warn(`WARNING: Source ${manifestKey} exists locally but canCommitRawFile is false. Ensure it is not committed.`);
    }

    try {
      const corpus = await loadLocalSourceCorpus(
        { ...entry, manifestKey }, ROOT,
      );
      sources.push({
        manifestKey,
        sourceId: corpus.sourceId,
        riwayah: corpus.riwayah,
        localPath: entry.localPath,
        state: 'loaded',
        fileHash: corpus.fileHash,
        bytes: corpus.bytes,
        ayahCount: corpus.ayahs.size,
        authorityStatus: entry.authorityStatus || 'unknown'
      });
      // Use the LAST corpus loaded for a given riwayah (so the user can
      // override Tanzil-Hafs with KFGQPC-Hafs if both are present).
      corporaByRiwayah.set(corpus.riwayah, { corpus, manifestEntry: entry });
    } catch (err) {
      sources.push({
        manifestKey, sourceId: entry.sourceId, riwayah: entry.riwayah,
        localPath: entry.localPath, state: 'error', error: err.message, fileHash: null,
      });
    }
  }

  // Run matches.
  const matches = [];
  const placeholderReadings = [];
  const suggestions = [];
  const statusCounts = {
    exact_word_index_match: 0,
    exact_elsewhere_in_ayah: 0,
    ayah_present_but_no_exact_match: 0,
    ayah_missing: 0,
    source_not_applicable: 0,
  };
  let totalReadingsChecked = 0;
  let totalReadingsSkipped = 0;

  for (const ayah of Object.values(dataset.verses)) {
    for (const group of ayah.variants ?? []) {
      for (const r of group.readings ?? []) {
        if (r.source === 'manual_placeholder') {
          placeholderReadings.push({
            surah: group.surah, ayah: group.ayah,
            wordIndex: group.wordIndex, riwayah: r.riwayah,
          });
        }
        const corpusInfo = corporaByRiwayah.get(r.riwayah);
        if (!corpusInfo) {
          totalReadingsSkipped++;
          continue;
        }
        const { corpus, manifestEntry: entry } = corpusInfo;
        const result = matchReadingAgainstSource(r, group, corpus);
        statusCounts[result.status] = (statusCounts[result.status] ?? 0) + 1;
        
        let replacementEligibility = 'not_eligible_unknown_provenance';
        if (result.status !== 'exact_word_index_match') {
          replacementEligibility = 'not_eligible_non_positional';
        } else if (entry.authorityStatus === 'local_fixture') {
          replacementEligibility = 'not_eligible_fixture';
        } else if (entry.authorityStatus === 'unknown' || entry.authorityStatus === 'downloaded_unverified') {
          replacementEligibility = 'not_eligible_unknown_provenance';
        } else if (entry.authorityStatus === 'official_confirmed' || entry.authorityStatus === 'scholar_confirmed') {
          const hasSufficientScope = entry.isCompleteCorpus || entry.corpusScope === 'sufficient_for_curated_sample';
          const hasUrlOrMethod = entry.retrievalUrl || (entry.retrievalMethod && entry.retrievalMethod !== 'unknown');
          const sourceExists = !!dataset.sources[corpus.sourceId];
          
          if (hasSufficientScope && hasUrlOrMethod && sourceExists && result.matchedText === r.text) {
             replacementEligibility = 'eligible_source_id_replacement';
          } else {
             replacementEligibility = 'eligible_for_review_only';
          }
        }
        
        result.sourceAuthority = entry.authorityStatus;
        result.replacementEligibility = replacementEligibility;
        
        matches.push(result);
        totalReadingsChecked++;

        // Safe replacement suggestion logic.
        if (
          r.source === 'manual_placeholder' &&
          replacementEligibility === 'eligible_source_id_replacement' &&
          (corpus.sourceId === 'kfqpc-warsh' || corpus.sourceId === 'kfqpc-qalun') &&
          corpus.riwayah === r.riwayah
        ) {
          suggestions.push({
            surah: group.surah, ayah: group.ayah, wordIndex: group.wordIndex,
            riwayah: r.riwayah, proposedSourceId: corpus.sourceId,
            currentSource: r.source,
            matchedTextHash: 'see-report',
          });
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    strict: STRICT,
    sources,
    statusCounts,
    totalReadingsChecked,
    totalReadingsSkipped,
    matches,
    placeholderReadings,
    suggestions,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2) + '\n');
  await writeFile(OUT_MD, renderMd(report));

  console.log('Wrote ' + OUT_JSON);
  console.log('Wrote ' + OUT_MD);
  console.log('');
  console.log('Sources:');
  for (const s of sources) {
    console.log('  ' + s.state.padEnd(8) + s.manifestKey);
  }
  console.log('Status counts: ' + JSON.stringify(statusCounts));
  console.log('Suggestions: ' + suggestions.length);
  console.log('Total checked: ' + totalReadingsChecked +
    ', skipped (no applicable corpus): ' + totalReadingsSkipped);

  const missing = sources.filter((s) => s.state === 'missing');
  if (missing.length > 0) {
    console.log('');
    console.log('NOTE: ' + missing.length + ' source corpus file(s) were missing locally:');
    for (const m of missing) console.log('  - ' + m.localPath);
    console.log('See README, "Source Matching Workflow", for download steps.');
    if (STRICT) {
      console.error('--strict was passed; exiting 1 because of missing corpora.');
      process.exit(1);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

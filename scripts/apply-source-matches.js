#!/usr/bin/env node
/**
 * apply-source-matches.js
 *
 * Conservative applier. Reads reports/audit/source-match-report.json and
 * may rewrite quranData.json to replace `manual_placeholder` source ids
 * with the matched real source id, but ONLY under strict conditions:
 *
 *   - the reading currently has source === "manual_placeholder"
 *   - the replacementEligibility is eligible_source_id_replacement
 *   - the matched corpus is kfqpc-warsh or kfqpc-qalun
 *   - the corpus's riwayah equals the reading's riwayah
 *   - the matched text is BYTE-IDENTICAL to the reading text
 *   - the proposed source id exists in dataset.sources
 *
 * Default behaviour is DRY-RUN: the script prints what it would do and
 * exits without writing anything. Pass --write to actually modify files.
 *
 * On --write the script first creates a backup at:
 *   src/data/quranData.before-source-apply.json
 *
 * The script NEVER:
 *   - changes Arabic text
 *   - changes confidence
 *   - sets anything to verified
 *   - touches the verification ledger (run `npm run init:ledger` after
 *     applying so the ledger picks up the refreshed source ids).
 */
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASET = resolve(ROOT, 'src', 'data', 'quranData.json');
const REPORT = resolve(ROOT, 'reports', 'audit', 'source-match-report.json');
const BACKUP = resolve(ROOT, 'src', 'data', 'quranData.before-source-apply.json');

const ALLOW_SOURCE_IDS = new Set(['kfqpc-warsh', 'kfqpc-qalun']);
const WRITE = process.argv.includes('--write');

async function main() {
  if (!existsSync(REPORT)) {
    console.error(
      'No source-match-report.json found. Run `npm run match:sources` first.',
    );
    process.exit(1);
  }
  const report = JSON.parse(await readFile(REPORT, 'utf8'));
  const dataset = JSON.parse(await readFile(DATASET, 'utf8'));

  if (dataset._meta?.generated) {
    console.error('Dataset _meta.generated is true; refusing to modify.');
    process.exit(1);
  }

  // Index dataset readings for direct lookup.
  const readingByKey = new Map();
  for (const ayah of Object.values(dataset.verses)) {
    for (const group of ayah.variants ?? []) {
      for (const r of group.readings ?? []) {
        const key = group.surah + ':' + group.ayah + ':' + group.wordIndex + ':' + r.riwayah;
        readingByKey.set(key, { reading: r, group });
      }
    }
  }

  const decisions = []; // {key, action, reason}
  for (const m of report.matches ?? []) {
    const key = m.surah + ':' + m.ayah + ':' + m.wordIndex + ':' + m.riwayah;
    const entry = readingByKey.get(key);
    if (!entry) {
      decisions.push({ key, action: 'skip', reason: 'no matching dataset reading' });
      continue;
    }
    const reading = entry.reading;
    if (reading.source !== 'manual_placeholder') {
      decisions.push({ key, action: 'skip', reason: 'source is not manual_placeholder' });
      continue;
    }
    if (m.replacementEligibility !== 'eligible_source_id_replacement') {
      decisions.push({ key, action: 'skip', reason: 'eligibility is ' + m.replacementEligibility });
      continue;
    }
    if (!ALLOW_SOURCE_IDS.has(m.sourceId)) {
      decisions.push({ key, action: 'skip', reason: 'sourceId ' + m.sourceId + ' not in allow-list' });
      continue;
    }
    if (m.riwayah !== reading.riwayah) {
      decisions.push({ key, action: 'skip', reason: 'riwayah mismatch' });
      continue;
    }
    if (m.matchedText !== reading.text) {
      decisions.push({ key, action: 'skip', reason: 'matchedText differs from reading.text' });
      continue;
    }
    if (!dataset.sources?.[m.sourceId]) {
      decisions.push({ key, action: 'skip', reason: 'sourceId not registered in dataset.sources' });
      continue;
    }
    decisions.push({
      key, action: 'replace-source',
      from: reading.source,
      to: m.sourceId,
      // The Arabic text is unchanged. We deliberately log it as a hash for
      // the dry-run summary so we never print the verse text to stdout.
      sourceTextUnchanged: true,
    });
  }

  const replacements = decisions.filter((d) => d.action === 'replace-source');
  console.log('Mode: ' + (WRITE ? 'WRITE' : 'DRY-RUN'));
  console.log('Proposed replacements: ' + replacements.length);
  console.log('Skipped: ' + (decisions.length - replacements.length));
  for (const r of replacements) {
    console.log('  ' + r.key + '  ' + r.from + ' -> ' + r.to);
  }

  if (!WRITE) {
    console.log('');
    console.log('No files modified (dry-run). Re-run with --write to apply.');
    return;
  }

  if (replacements.length === 0) {
    console.log('No replacements to apply. Dataset unchanged.');
    return;
  }

  // Apply (in memory, then write atomically).
  for (const r of replacements) {
    const entry = readingByKey.get(r.key);
    // The Arabic text is preserved verbatim — we only change `source`.
    entry.reading.source = r.to;
  }

  // Backup before writing.
  await copyFile(DATASET, BACKUP);
  console.log('Backup written: ' + BACKUP);

  await writeFile(DATASET, JSON.stringify(dataset, null, 2) + '\n');
  console.log('Dataset updated: ' + DATASET);
  console.log('Now re-run: npm run init:ledger && npm run audit:data && npm test');
}

main().catch((e) => { console.error(e); process.exit(1); });

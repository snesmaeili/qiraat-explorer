#!/usr/bin/env node
/**
 * audit-data.js
 *
 * Loads quranData.json + verificationLedger.json, runs the audit, and writes
 * two reports to reports/audit/:
 *   - quran-data-audit.json     full machine-readable audit output
 *   - quran-data-audit.md       human-readable summary snapshot
 *
 * Exit code:
 *   0  no hard integrity errors (warnings are OK)
 *   1  hard integrity errors found (see "HARD ERRORS" section in the report)
 *
 * Hard errors include:
 *   - dataset _meta.generationPolicy is not "no-arabic-text-generation"
 *   - dataset _meta.generated is true
 *   - reading missing or unknown source id
 *   - reading uses unknown riwayah id
 *   - VariantGroup wordIndex outside the verse's token range
 *   - VariantGroup has no reading entry for its baseRiwayah
 *   - VariantGroup confidence=verified but contains a manual_placeholder
 *
 * Warnings (non-fatal):
 *   - curated_sample / needs_review / unreviewed entries
 *   - empty ledger
 *   - ledger records whose id doesn't match any live reading
 *   - textHash drift on existing ledger records
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditDataset } from '../src/lib/auditDataset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASET = resolve(ROOT, 'src', 'data', 'quranData.json');
const LEDGER = resolve(ROOT, 'src', 'data', 'verificationLedger.json');
const OUT_DIR = resolve(ROOT, 'reports', 'audit');
const OUT_JSON = resolve(OUT_DIR, 'quran-data-audit.json');
const OUT_MD = resolve(OUT_DIR, 'quran-data-audit.md');

function indent(items, depth = 1) {
  if (!items || items.length === 0) return '_(none)_';
  return items.slice(0, 50).map((x) => '  '.repeat(depth) + '- ' + JSON.stringify(x)).join('\n');
}

function renderMarkdown(audit, datasetMeta, ledgerMeta) {
  const s = audit.summary;
  const lines = [];
  lines.push('# Qiraat Explorer — dataset audit report');
  lines.push('');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('## Dataset metadata');
  lines.push('- schemaVersion: `' + (datasetMeta.schemaVersion ?? '?') + '`');
  lines.push('- generated: `' + datasetMeta.generated + '`');
  lines.push('- generationPolicy: `' + (datasetMeta.generationPolicy ?? '?') + '`');
  lines.push('- lastReviewed: `' + (datasetMeta.lastReviewed ?? '—') + '`');
  lines.push('');
  lines.push('## Ledger metadata');
  lines.push('- schemaVersion: `' + (ledgerMeta.schemaVersion ?? '?') + '`');
  lines.push('- lastInitialised: `' + (ledgerMeta.lastInitialised ?? '—') + '`');
  lines.push('- lastReviewed: `' + (ledgerMeta.lastReviewed ?? '—') + '`');
  lines.push('');
  lines.push('## Summary counts');
  lines.push('| metric | count |');
  lines.push('|---|---:|');
  lines.push('| totalVerses | ' + s.totalVerses + ' |');
  lines.push('| totalVariantGroups | ' + s.totalVariantGroups + ' |');
  lines.push('| totalReadings | ' + s.totalReadings + ' |');
  lines.push('| manualPlaceholderCount | ' + s.manualPlaceholderCount + ' |');
  lines.push('| missingSourceCount | ' + s.missingSourceCount + ' |');
  lines.push('| invalidCitationCount | ' + s.invalidCitationCount + ' |');
  lines.push('');
  lines.push('### By VariantGroup confidence');
  for (const [k, v] of Object.entries(s.byConfidence)) {
    lines.push('- `' + k + '`: ' + v);
  }
  lines.push('');
  lines.push('### By VerificationStatus (per-reading)');
  for (const [k, v] of Object.entries(s.byVerificationStatus)) {
    lines.push('- `' + k + '`: ' + v);
  }
  lines.push('');

  lines.push('## Hard errors (' + audit.hardErrors.length + ')');
  if (audit.hardErrors.length === 0) {
    lines.push('_None._');
  } else {
    for (const e of audit.hardErrors) lines.push('- ' + e);
  }
  lines.push('');

  lines.push('## Warnings (' + audit.warnings.length + ')');
  if (audit.warnings.length === 0) {
    lines.push('_None._');
  } else {
    for (const w of audit.warnings) lines.push('- ' + w);
  }
  lines.push('');

  function section(title, key) {
    lines.push('### ' + title + ' (' + (audit[key]?.length ?? 0) + ')');
    lines.push('```');
    lines.push(indent(audit[key], 0));
    lines.push('```');
    lines.push('');
  }
  lines.push('## Diagnostic lists');
  section('Manual-placeholder readings', 'manualPlaceholderReadings');
  section('Curated-sample readings', 'curatedSampleReadings');
  section('Needs-review readings', 'needsReviewReadings');
  section('Missing or unknown source references', 'missingSourceReferences');
  section('Unknown riwayah references', 'unknownRiwayahReferences');
  section('VariantGroups missing base reading', 'variantGroupsWithoutBaseReading');
  section('Invalid wordIndexes', 'invalidWordIndexes');
  section('Readings without a verification record', 'readingsWithoutVerificationRecord');
  section('Verification records with no matching reading', 'verificationRecordsWithoutMatchingReading');
  section('Possible promotion candidates', 'possiblePromotionCandidates');

  lines.push('---');
  lines.push('');
  lines.push('Generated by `npm run audit:data`. See README → "Verification Workflow" for the review process.');
  return lines.join('\n') + '\n';
}

async function main() {
  const dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  let ledger;
  try {
    ledger = JSON.parse(await readFile(LEDGER, 'utf8'));
  } catch {
    ledger = { _meta: {}, records: [] };
  }

  const audit = auditDataset(dataset, ledger);
  await mkdir(OUT_DIR, { recursive: true });

  const fullJson = {
    generatedAt: new Date().toISOString(),
    datasetMeta: dataset._meta ?? {},
    ledgerMeta: ledger._meta ?? {},
    ...audit,
  };

  await writeFile(OUT_JSON, JSON.stringify(fullJson, null, 2) + '\n');
  await writeFile(OUT_MD, renderMarkdown(audit, dataset._meta ?? {}, ledger._meta ?? {}));

  console.log('Wrote ' + OUT_JSON);
  console.log('Wrote ' + OUT_MD);
  console.log('');
  console.log('Summary:');
  console.log('  verses:           ' + audit.summary.totalVerses);
  console.log('  variant groups:   ' + audit.summary.totalVariantGroups);
  console.log('  readings:         ' + audit.summary.totalReadings);
  console.log('  manual_placeholder: ' + audit.summary.manualPlaceholderCount);
  console.log('  by confidence:    ' + JSON.stringify(audit.summary.byConfidence));
  console.log('  by status:        ' + JSON.stringify(audit.summary.byVerificationStatus));
  console.log('  hard errors:      ' + audit.hardErrors.length);
  console.log('  warnings:         ' + audit.warnings.length);

  if (audit.hardErrors.length > 0) {
    console.error('\nHARD INTEGRITY ERRORS:');
    for (const e of audit.hardErrors) console.error('  - ' + e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

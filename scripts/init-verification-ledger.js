#!/usr/bin/env node
/**
 * init-verification-ledger.js
 *
 * Creates one VerificationRecord stub per VariantReading in quranData.json
 * and writes them to verificationLedger.json. Existing records are preserved
 * by id; the script NEVER overwrites a reviewer's status, reviewer field,
 * reviewedAt, notes, or evidenceLink. The only field the script may update
 * on an existing record is `textHash` (to flag drift) and `readingText`
 * (kept verbatim from the dataset, but only if the reviewer hasn't yet
 * marked the record as scholar_verified — otherwise we surface a warning).
 *
 * Hard contract: this script copies Arabic text VERBATIM from quranData.json.
 * It never invents, modifies, or normalises any reading text.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildVerificationStubs,
  createTextHash,
} from '../src/lib/auditDataset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = resolve(__dirname, '..', 'src', 'data', 'quranData.json');
const LEDGER = resolve(__dirname, '..', 'src', 'data', 'verificationLedger.json');

const REVIEWER_FIELDS = [
  'status',
  'reviewer',
  'reviewedAt',
  'notes',
  'evidenceLink',
  'sourceReference',
];

async function main() {
  const dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const ledger = JSON.parse(await readFile(LEDGER, 'utf8'));

  const existingById = new Map();
  for (const rec of ledger.records ?? []) existingById.set(rec.id, rec);

  const stubs = buildVerificationStubs(dataset);
  const merged = [];
  let preserved = 0;
  let created = 0;
  let drifted = 0;

  for (const stub of stubs) {
    const existing = existingById.get(stub.id);
    if (!existing) {
      merged.push(stub);
      created++;
      continue;
    }
    // Preserve every reviewer-owned field. Only the dataset-derived fields
    // (readingText, textHash, source, variantKey, surah/ayah/wordIndex) are
    // refreshed from the current dataset.
    const refreshed = {
      ...stub,
    };
    for (const k of REVIEWER_FIELDS) {
      if (existing[k] !== undefined) refreshed[k] = existing[k];
    }
    if (existing.textHash && existing.textHash !== stub.textHash) {
      drifted++;
      // If the previously-recorded text doesn't match the current dataset,
      // automatically downgrade scholar_verified -> needs_correction so a
      // reviewer must re-confirm.
      if (refreshed.status === 'scholar_verified') {
        refreshed.status = 'needs_correction';
        refreshed.notes =
          (refreshed.notes ? refreshed.notes + ' | ' : '') +
          'AUTO-DOWNGRADE: dataset text changed since previous verification ' +
          '(was hash ' + existing.textHash + ', now ' + stub.textHash + ').';
      }
    }
    merged.push(refreshed);
    preserved++;
  }

  // Records in the old ledger that no longer correspond to a dataset reading
  // are kept under a separate `_orphans` array so reviewer notes are never
  // lost, but they don't appear in `records`.
  const liveIds = new Set(stubs.map((s) => s.id));
  const orphans = [];
  for (const rec of ledger.records ?? []) {
    if (!liveIds.has(rec.id)) orphans.push(rec);
  }

  const out = {
    _meta: {
      schemaVersion: ledger._meta?.schemaVersion ?? '1.0.0',
      purpose: ledger._meta?.purpose ??
        'Human review ledger for qira\'at variant verification.',
      generated: false,
      generationPolicy: 'no-arabic-text-generation',
      lastReviewed: ledger._meta?.lastReviewed ?? null,
      lastInitialised: new Date().toISOString(),
    },
    records: merged.sort((a, b) =>
      a.surah - b.surah ||
      a.ayah - b.ayah ||
      a.wordIndex - b.wordIndex ||
      a.riwayah.localeCompare(b.riwayah),
    ),
  };
  if (orphans.length > 0) out._orphans = orphans;

  await writeFile(LEDGER, JSON.stringify(out, null, 2) + '\n');

  console.log(
    'Wrote ' + LEDGER + '\n' +
    '  records: ' + out.records.length + '\n' +
    '  created: ' + created + '\n' +
    '  preserved: ' + preserved + '\n' +
    '  drifted (textHash mismatched): ' + drifted + '\n' +
    '  orphans (no longer in dataset): ' + orphans.length,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

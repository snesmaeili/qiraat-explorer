// Audit utilities for the qiraat dataset and its verification ledger.
//
// Hard contract: this module NEVER produces or modifies Quranic Arabic text.
// It only:
//   - reads from quranData.json + verificationLedger.json
//   - computes hashes / keys / counts
//   - copies existing readingText strings verbatim into ledger stubs
//
// Pure functions, browser-safe. No external dependencies.

/**
 * Browser-safe deterministic hash for short text strings (FNV-1a 32-bit).
 * Used to detect when a dataset reading text changes after a verification
 * record was created — a hash mismatch flags the record as stale.
 *
 * Output format: "fnv1a:" + 8 lowercase hex digits.
 *
 * Pure: same input always produces same output, no global state, no I/O.
 *
 * @param {string} text
 * @returns {string}
 */
export function createTextHash(text) {
  if (text == null) return 'fnv1a:00000000';
  let h = 0x811c9dc5; // FNV offset basis
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    // mix each byte of the codepoint
    h ^= cp & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= (cp >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
    if (cp > 0xffff) {
      h ^= (cp >>> 16) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return 'fnv1a:' + h.toString(16).padStart(8, '0');
}

/**
 * Stable VariantGroup key. Used as the cross-reference between the dataset
 * (quranData.json) and the ledger (verificationLedger.json).
 *
 * @param {Object} args
 * @param {number} args.surah
 * @param {number} args.ayah
 * @param {number} args.wordIndex
 * @param {string} args.baseRiwayah
 * @param {string} args.category
 * @returns {string}
 */
export function makeVariantKey({ surah, ayah, wordIndex, baseRiwayah, category }) {
  return `q${surah}-${ayah}-w${wordIndex}-${baseRiwayah}-${category}`;
}

/**
 * Per-reading record id. Distinct from variantKey because the ledger tracks
 * each reading individually (one VariantGroup -> N records, one per
 * VariantReading).
 */
export function makeRecordId({ surah, ayah, wordIndex, riwayah }) {
  return `q${surah}-${ayah}-w${wordIndex}-${riwayah}`;
}

/**
 * Build VerificationRecord stubs from the dataset.
 *
 * - One stub per VariantReading.
 * - readingText is copied VERBATIM from the dataset (no modification).
 * - Default status:
 *     scholar_verified   if the variant group's confidence is "verified"
 *                        AND no reading uses the manual_placeholder source
 *     unreviewed         otherwise
 *
 * Pure: input dataset is not mutated. Returns a fresh array.
 *
 * @param {Object} dataset  the quranData bundle
 * @returns {VerificationRecord[]}
 */
export function buildVerificationStubs(dataset) {
  const out = [];
  if (!dataset || !dataset.verses) return out;
  for (const ayah of Object.values(dataset.verses)) {
    for (const group of ayah.variants ?? []) {
      const groupHasPlaceholder = (group.readings ?? []).some(
        (r) => r.source === 'manual_placeholder',
      );
      const variantKey = makeVariantKey({
        surah: group.surah,
        ayah: group.ayah,
        wordIndex: group.wordIndex,
        baseRiwayah: group.baseRiwayah,
        category: group.category,
      });
      for (const r of group.readings ?? []) {
        const id = makeRecordId({
          surah: group.surah,
          ayah: group.ayah,
          wordIndex: group.wordIndex,
          riwayah: r.riwayah,
        });
        const status =
          group.confidence === 'verified' && !groupHasPlaceholder
            ? 'scholar_verified'
            : 'unreviewed';
        out.push({
          id,
          surah: group.surah,
          ayah: group.ayah,
          wordIndex: group.wordIndex,
          variantKey,
          riwayah: r.riwayah,
          readingText: r.text, // VERBATIM copy — no transformation
          source: r.source,
          status,
          textHash: createTextHash(r.text),
        });
      }
    }
  }
  return out;
}

/**
 * Audit the dataset against the ledger and return a summary plus diagnostic
 * lists. Pure function: neither argument is mutated.
 *
 * @param {Object} dataset
 * @param {Object} [ledger]
 * @returns {{
 *   summary: DatasetAuditSummary,
 *   manualPlaceholderReadings: Array,
 *   needsReviewReadings: Array,
 *   curatedSampleReadings: Array,
 *   missingSourceReferences: Array,
 *   unknownRiwayahReferences: Array,
 *   variantGroupsWithoutBaseReading: Array,
 *   invalidWordIndexes: Array,
 *   readingsWithoutVerificationRecord: Array,
 *   verificationRecordsWithoutMatchingReading: Array,
 *   possiblePromotionCandidates: Array,
 *   hardErrors: string[],
 *   warnings: string[],
 * }}
 */
export function auditDataset(dataset, ledger) {
  const safeDataset = dataset ?? { _meta: {}, sources: {}, verses: {}, riwayat: [] };
  const safeLedger = ledger ?? { records: [] };

  const knownSources = new Set(Object.keys(safeDataset.sources ?? {}));
  const knownRiwayat = new Set((safeDataset.riwayat ?? []).map((r) => r.id));
  const ledgerById = new Map();
  for (const rec of safeLedger.records ?? []) ledgerById.set(rec.id, rec);

  const summary = {
    totalVerses: 0,
    totalVariantGroups: 0,
    totalReadings: 0,
    byConfidence: {},
    byVerificationStatus: {
      unreviewed: 0,
      source_located: 0,
      text_matched: 0,
      scholar_verified: 0,
      rejected: 0,
      needs_correction: 0,
    },
    manualPlaceholderCount: 0,
    missingSourceCount: 0,
    invalidCitationCount: 0,
    generatedDataset: !!safeDataset._meta?.generated,
    generationPolicy: safeDataset._meta?.generationPolicy ?? '',
  };

  const manualPlaceholderReadings = [];
  const needsReviewReadings = [];
  const curatedSampleReadings = [];
  const missingSourceReferences = [];
  const unknownRiwayahReferences = [];
  const variantGroupsWithoutBaseReading = [];
  const invalidWordIndexes = [];
  const readingsWithoutVerificationRecord = [];
  const verificationRecordsWithoutMatchingReading = [];
  const possiblePromotionCandidates = [];
  const hardErrors = [];
  const warnings = [];

  // 1. Hard tripwire: dataset must declare no-generation policy.
  if (summary.generationPolicy !== 'no-arabic-text-generation') {
    hardErrors.push(
      'Dataset _meta.generationPolicy is "' + summary.generationPolicy + '"; ' +
        'expected "no-arabic-text-generation". Refusing to proceed.',
    );
  }
  if (summary.generatedDataset) {
    hardErrors.push('Dataset _meta.generated is true. Sacred text integrity violated.');
  }

  // 2. Per-verse / per-group / per-reading walk.
  const liveRecordIds = new Set();
  for (const [verseKey, ayah] of Object.entries(safeDataset.verses ?? {})) {
    summary.totalVerses++;
    const tokenLen = ayah.baseText?.tokens?.length ?? 0;

    for (const group of ayah.variants ?? []) {
      summary.totalVariantGroups++;
      summary.byConfidence[group.confidence] =
        (summary.byConfidence[group.confidence] ?? 0) + 1;

      // wordIndex bounds check
      if (
        typeof group.wordIndex !== 'number' ||
        group.wordIndex < 0 ||
        group.wordIndex >= tokenLen
      ) {
        invalidWordIndexes.push({
          verseKey,
          variantKey: safeMakeKey(group),
          wordIndex: group.wordIndex,
          tokenLen,
        });
        hardErrors.push(
          verseKey + ' VariantGroup wordIndex ' + group.wordIndex +
            ' is outside 0..' + (tokenLen - 1),
        );
      }

      // citations resolve?
      for (const c of group.citations ?? []) {
        if (!knownSources.has(c)) {
          summary.invalidCitationCount++;
          hardErrors.push(
            verseKey + ' VariantGroup ' + safeMakeKey(group) +
              ' cites unknown source "' + c + '"',
          );
        }
      }

      // base reading must be present if baseRiwayah is set
      let groupHasPlaceholder = false;
      let foundBaseReading = false;
      for (const r of group.readings ?? []) {
        summary.totalReadings++;

        if (!r.source) {
          summary.missingSourceCount++;
          missingSourceReferences.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
          });
          hardErrors.push(
            verseKey + ' reading riwayah=' + r.riwayah + ' has no source id',
          );
        } else if (!knownSources.has(r.source)) {
          missingSourceReferences.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
            source: r.source,
          });
          hardErrors.push(
            verseKey + ' reading riwayah=' + r.riwayah +
              ' has unknown source id "' + r.source + '"',
          );
        }

        if (r.source === 'manual_placeholder') {
          summary.manualPlaceholderCount++;
          groupHasPlaceholder = true;
          manualPlaceholderReadings.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
          });
        }

        if (r.riwayah && !knownRiwayat.has(r.riwayah)) {
          unknownRiwayahReferences.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
          });
          hardErrors.push(
            verseKey + ' reading uses unknown riwayah id "' + r.riwayah + '"',
          );
        }

        if (r.riwayah === group.baseRiwayah) foundBaseReading = true;

        // ledger cross-check
        const recordId = makeRecordId({
          surah: group.surah,
          ayah: group.ayah,
          wordIndex: group.wordIndex,
          riwayah: r.riwayah,
        });
        liveRecordIds.add(recordId);
        const rec = ledgerById.get(recordId);
        if (rec) {
          summary.byVerificationStatus[rec.status] =
            (summary.byVerificationStatus[rec.status] ?? 0) + 1;
          // Drift detection: if the recorded readingText differs from current,
          // the record is stale and must NOT count as verified.
          const currentHash = createTextHash(r.text);
          if (rec.textHash && rec.textHash !== currentHash) {
            warnings.push(
              recordId + ' ledger record textHash is stale ' +
                '(dataset text changed since record was created); status downgraded',
            );
          }
          if (
            rec.status === 'scholar_verified' &&
            (rec.textHash !== currentHash || r.source === 'manual_placeholder')
          ) {
            // Promotion to verified is unsafe under these conditions.
            possiblePromotionCandidates.push({
              recordId,
              reason: rec.textHash !== currentHash ? 'stale-hash' : 'placeholder-source',
            });
          }
          if (
            rec.status === 'scholar_verified' &&
            rec.textHash === currentHash &&
            r.source !== 'manual_placeholder' &&
            group.confidence !== 'verified'
          ) {
            // All readings in this group ledger-verified? -> promotion candidate.
            possiblePromotionCandidates.push({
              recordId,
              reason: 'ledger-verified-but-confidence-not-verified',
            });
          }
        } else {
          summary.byVerificationStatus.unreviewed++;
          readingsWithoutVerificationRecord.push({
            verseKey, recordId, riwayah: r.riwayah,
          });
        }
      }

      if (!foundBaseReading) {
        variantGroupsWithoutBaseReading.push({
          verseKey, variantKey: safeMakeKey(group),
          baseRiwayah: group.baseRiwayah,
        });
        hardErrors.push(
          verseKey + ' VariantGroup ' + safeMakeKey(group) +
            ' has no reading entry for its baseRiwayah=' + group.baseRiwayah,
        );
      }

      if (group.confidence === 'verified' && groupHasPlaceholder) {
        hardErrors.push(
          verseKey + ' VariantGroup ' + safeMakeKey(group) +
            ' is confidence=verified but contains a manual_placeholder reading',
        );
      }

      // confidence buckets for warnings list
      if (group.confidence === 'curated_sample') {
        for (const r of group.readings ?? []) {
          curatedSampleReadings.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
          });
        }
      }
      if (group.confidence === 'needs_review') {
        for (const r of group.readings ?? []) {
          needsReviewReadings.push({
            verseKey, variantKey: safeMakeKey(group), riwayah: r.riwayah,
          });
        }
      }
    }
  }

  // 3. Ledger records that don't match anything in the dataset.
  for (const rec of safeLedger.records ?? []) {
    if (!liveRecordIds.has(rec.id)) {
      verificationRecordsWithoutMatchingReading.push({
        id: rec.id, riwayah: rec.riwayah,
      });
      warnings.push(
        'Ledger record ' + rec.id + ' has no matching dataset reading',
      );
    }
  }

  // 4. Empty-ledger warning (informational).
  if ((safeLedger.records ?? []).length === 0) {
    warnings.push(
      'Verification ledger is empty; run `npm run init:ledger` to seed stubs',
    );
  }

  // 5. Curated-sample / needs_review counts also surface as warnings so
  //    the audit script can report progress without failing.
  if (curatedSampleReadings.length > 0) {
    warnings.push(
      curatedSampleReadings.length + ' readings are tagged curated_sample',
    );
  }
  if (needsReviewReadings.length > 0) {
    warnings.push(
      needsReviewReadings.length + ' readings are tagged needs_review',
    );
  }
  if (manualPlaceholderReadings.length > 0) {
    warnings.push(
      manualPlaceholderReadings.length + ' readings have a manual_placeholder source',
    );
  }

  return {
    summary,
    manualPlaceholderReadings,
    needsReviewReadings,
    curatedSampleReadings,
    missingSourceReferences,
    unknownRiwayahReferences,
    variantGroupsWithoutBaseReading,
    invalidWordIndexes,
    readingsWithoutVerificationRecord,
    verificationRecordsWithoutMatchingReading,
    possiblePromotionCandidates,
    hardErrors,
    warnings,
  };
}

function safeMakeKey(group) {
  return makeVariantKey({
    surah: group.surah,
    ayah: group.ayah,
    wordIndex: group.wordIndex,
    baseRiwayah: group.baseRiwayah,
    category: group.category,
  });
}

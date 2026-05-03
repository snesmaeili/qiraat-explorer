import React, { useMemo } from 'react';

/**
 * Tiny dataset status badge. Computed entirely from the loaded dataset —
 * does NOT load the full audit report. The runtime classification is the
 * worst-case label that applies to any group/reading currently visible.
 *
 *   "Contains manual placeholders" — at least one reading uses
 *                                    manual_placeholder; reviewer attention
 *                                    needed.
 *   "Needs review"                 — at least one group is needs_review.
 *   "Curated sample"               — all groups are curated_sample.
 *   "All visible readings source-linked" — best case: every reading has a
 *                                          real source id and every group
 *                                          is verified.
 */
export function AuditBadge({ dataset }) {
  const status = useMemo(() => classify(dataset), [dataset]);
  return (
    <span
      className={'badge badge--' + status.cls}
      title={status.tooltip}
      aria-label={'Dataset status: ' + status.label}
    >
      {status.label}
    </span>
  );
}

function classify(dataset) {
  if (!dataset || !dataset.verses) {
    return { cls: 'pending', label: 'No data', tooltip: 'Dataset not loaded.' };
  }
  let hasPlaceholder = false;
  let hasNeedsReview = false;
  let hasCuratedSample = false;
  let allVerified = true;
  let anyGroup = false;
  for (const ayah of Object.values(dataset.verses)) {
    for (const g of ayah.variants ?? []) {
      anyGroup = true;
      if ((g.readings ?? []).some((r) => r.source === 'manual_placeholder')) {
        hasPlaceholder = true;
      }
      if (g.confidence === 'needs_review') hasNeedsReview = true;
      if (g.confidence === 'curated_sample') hasCuratedSample = true;
      if (g.confidence !== 'verified') allVerified = false;
    }
  }
  if (!anyGroup) {
    return { cls: 'pending', label: 'Empty dataset', tooltip: 'No variant groups loaded.' };
  }
  if (hasPlaceholder) {
    return {
      cls: 'warn',
      label: 'Contains manual placeholders',
      tooltip:
        'One or more readings use the manual_placeholder source id. ' +
        'Run `npm run audit:data` for the full list.',
    };
  }
  if (hasNeedsReview) {
    return {
      cls: 'warn',
      label: 'Needs review',
      tooltip:
        'One or more variant groups are tagged needs_review. See the ' +
        'verificationLedger.json for the review queue.',
    };
  }
  if (hasCuratedSample) {
    return {
      cls: 'warn',
      label: 'Curated sample',
      tooltip:
        'All shown variants are curated representative examples; not yet ' +
        'scholar-verified. See README, Verification Workflow.',
    };
  }
  if (allVerified) {
    return {
      cls: 'ok',
      label: 'All visible readings source-linked',
      tooltip:
        'Every visible variant group is confidence=verified and every ' +
        'reading has a real source citation.',
    };
  }
  return { cls: 'pending', label: 'Mixed', tooltip: 'Mixed confidence levels.' };
}

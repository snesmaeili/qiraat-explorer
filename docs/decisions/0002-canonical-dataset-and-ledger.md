# 2. Canonical Dataset and Ledger

**Status:** Accepted

## Context
We need a way to track both the core reading data (what is displayed) and the review process (who verified it and when), without mixing the two domains.

## Decision
We separate the curated dataset from the human verification workflow:
- `src/data/quranData.json`: The source dataset containing verses, variant groups, reading attributions, and a display `confidence` label (`curated_sample`, `needs_review`, `verified`).
- `src/data/verificationLedger.json`: The review ledger containing `VerificationRecord` items for each reading, tracking reviewer identity, review status (`text_matched`, `scholar_verified`, etc.), and timestamps.

## Consequences
- Dataset edits do not conflict with the review workflow or overwrite reviewer fingerprints.
- The review ledger can be replaced or backed by a database later without changing the core runtime dataset.
- Changes in the Arabic text (detected via `textHash` drifts) automatically invalidate corresponding ledger records, ensuring stale reviews are not presented as current.

## Tests/guards enforcing the decision
- `scripts/audit-data.js` cross-checks the dataset against the ledger and fails on hard errors.
- `scripts/init-verification-ledger.js` updates dataset-derived fields but never overwrites reviewer-owned fields.
- `tests/audit.test.js` ensures that confidence labels and ledger statuses align correctly.

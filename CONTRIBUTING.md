# Contributing to Qira'at Explorer

This is a private academic research repository. Contributions are currently limited to the core research team until the results are published. This project deals with sacred text, so we enforce strict integrity policies to ensure that every variant displayed is traceable to an authoritative primary source.

## Rule 1: No AI-Generated Qur'anic Arabic
**Do not use LLMs to generate or "autocomplete" Arabic verse text.** Every Arabic string must be copied verbatim from a cited primary source dataset (e.g., Tanzil, KFGQPC) or classical qira'at literature.

## Adding a Variant Safely
1. Locate the exact Arabic text from a verified source.
2. Edit `src/data/quranData.json` manually to add the `VariantGroup` and its `readings`.
3. Set the `source` to the appropriate `SourceCitation.id`. If a citation does not exist in the manifest, add it to the `bundle.sources`.
4. If you have not verified the provenance yet, set the source to `manual_placeholder`.
5. Run `npm run init:ledger` to generate the tracking record.

## Updating Source Citations
- Source records are kept in `src/data/quranData.json` under the `sources` block.
- When you cross-check a reading with a primary source (e.g., *an-Nashr*), replace the `manual_placeholder` with a definitive `sourceId`.

## Submitting a Verification Update
When you verify an existing variant:
1. Update `src/data/verificationLedger.json`.
2. Find the relevant `VerificationRecord`.
3. Set `status` to `scholar_verified` or `text_matched`.
4. Add your initials/name to `reviewer` and set the `reviewedAt` date.
5. If all readings in the variant group are verified, you may change the dataset's `confidence` from `needs_review`/`curated_sample` to `verified`.

## Reviewer Checklist
Before accepting data changes, reviewers MUST check:
- Has the text been copied verbatim? (Diacritics must match character-for-character).
- Is `confidence: verified` used correctly? (No `manual_placeholder` readings exist in the group).
- Did `npm test` and `npm run audit:data` pass?

## Daily Commands
- **Audit Data:** `npm run audit:data`
- **Record Provenance:** `npm run record:provenance`
- **Match Sources:** `npm run match:sources`
- **Run Tests:** `npm test`
- **Build App:** `npm run build`

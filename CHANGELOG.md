# Changelog

All notable changes to this project will be documented in this file.

## v0.1.0 — Prototype integrity release (2026-05-03)
- **Curated qira'at explorer UI:** Core UI components built for displaying verses, variants, and tooltips.
- **Canonical quranData.json:** Formatted and deep-frozen dataset for tracking text variants across Hafs, Warsh, and Qalun.
- **Data integrity system:** Sacred Text Integrity Policy enforced by runtime deep-freeze, tripwire flags, and 35 integrity tests.
- **Verification ledger:** Created a standalone review ledger (`verificationLedger.json`) to decouple dataset from review workflows.
- **Audit reports:** Added `audit-data.js` script to validate invariants between the dataset and the ledger.
- **Provenance tracking:** Local corpora hashing and metadata recorded in `source-provenance.json`.
- **Source authority rules:** Explicit definitions for corpus provenance (`unknown`, `local_fixture`, `official_confirmed`, `scholar_confirmed`). Unknown-provenance corpora produce diagnostic matches only, never automatic source ID replacements.
- **HarfBuzz optional fallback:** Shaping degrades gracefully to native browser rendering when the WASM blob or fonts are absent.
- **CI:** GitHub Actions workflow runs audit, tests, and build on push/PR to `main`.
- **Private contribution policy:** Contributions restricted to the core research team until publication.
- **Test coverage:** 122 passing tests covering UI, arabic token parsing, alignment diffs, provenance, source matching, and Sacred Text Integrity Policies.

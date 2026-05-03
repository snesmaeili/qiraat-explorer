# Changelog

All notable changes to this project will be documented in this file.

## v0.1.0 — Prototype integrity release
- **Curated qira'at explorer UI:** Core UI components built for displaying verses, variants, and tooltips.
- **Canonical quranData.json:** Formatted and deep-frozen dataset for tracking text variants across Hafs, Warsh, and Qalun.
- **Verification ledger:** Created a standalone review ledger (`verificationLedger.json`) to decouple dataset from review workflows.
- **Audit reports:** Added `audit-data.js` script to validate invariants between the dataset and the ledger.
- **Provenance tracking:** Local corpora hashing and metadata recorded in `source-provenance.json`.
- **Source authority rules:** Explicit definitions for corpus provenance (`unknown`, `local_fixture`, `official_confirmed`, `scholar_confirmed`).
- **HarfBuzz optional fallback:** Shaping degrades gracefully to native browser rendering when the WASM blob or fonts are absent.
- **Test coverage:** 122 passing tests covering UI, arabic token parsing, alignment diffs, and Sacred Text Integrity Policies.

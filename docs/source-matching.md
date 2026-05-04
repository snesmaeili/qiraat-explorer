# Source Matching Workflow

This document covers the **mechanical** workflow of matching readings in the dataset against externally-obtained corpora. It complements (does not replace) the **scholarly** verification workflow described in [CONTRIBUTING.md](../CONTRIBUTING.md), which is what actually promotes a reading's `confidence` to `verified`.

The verification workflow asks: _has a human reviewer attested to this reading?_
The source-matching workflow asks the prior, mechanical question: _does the Arabic in `quranData.json` match a legally-obtained external corpus, character-for-character?_

An exact match cannot replace human judgement, but it CAN justify swapping a `manual_placeholder` source id for a real one — because the reading is now traceable to a recorded line of an upstream file.

## What a match does and does not prove

**Source matching is not scholar verification.** A byte-for-byte match against KFGQPC Warsh proves the text agrees with that distribution; it does not prove the variant is correctly attributed across the qira'at literature. Promotion to `confidence: verified` still requires a human reviewer working through CONTRIBUTING.md → "Submitting a Verification Update."

**The repo does not bundle raw Qur'an corpora.** Tanzil and KFGQPC distributions have their own license terms, and shipping them inside this repository would be redistribution. Obtain them under their licenses and place locally:

- Tanzil Hafs Uthmani text → `scripts/_raw/quran-uthmani.txt` (download requires accepting Tanzil terms at https://tanzil.net/download/)
- KFGQPC Warsh JSON → `scripts/_raw/kfqpc-warsh.json`
- KFGQPC Qālūn JSON → `scripts/_raw/kfqpc-qalun.json`

`scripts/_raw/` is git-ignored. The declared corpora live in `src/data/sourceManifest.json` along with the upstream URL, license note, expected file hash (optional), and parser format.

## Source provenance and raw-corpus policy

- Raw corpora are not committed.
- `scripts/_raw/` is local-only.
- `source-provenance.json` stores hashes and metadata only — never raw text.
- Source matching is reproducible only if the same local files are available.
- Exact match is _not_ scholar verification.
- Replacing `manual_placeholder` with `kfqpc-warsh` / `kfqpc-qalun` means "matched local source corpus" — _not_ `scholar_verified`.
- `confidence` remains `curated_sample` until human review.

## Source authority levels

The provenance of local files determines whether an exact match can authorize replacing `manual_placeholder` with a definitive source id. See [docs/decisions/0003-source-authority-levels.md](decisions/0003-source-authority-levels.md) for the formal ADR.

- **`unknown` / `downloaded_unverified`** — Unknown local files cannot justify replacing source ids. Exact match against an unconfirmed file is not official provenance.
- **`local_fixture`** — Subsets used for testing only. They cannot change source ids.
- **`official_confirmed`** — Requires a documented retrieval URL, retrieval method, file hash, and license. If an exact match occurs against an officially confirmed corpus, `manual_placeholder` may be replaced by the matching `sourceId`.
- **`scholar_confirmed`** — Requires documented human review and independent verification.
- `manual_placeholder` should remain in the dataset until source authority is `official_confirmed` or higher.

Source matching is a diagnostic step, not an automatic claim of authority.

## Day-to-day commands

```bash
npm run match:sources              # exact-match each reading against any local
                                    # corpora; produces a report.
                                    # Missing corpora = warnings, not errors.
npm run match:sources:strict       # same but exits 1 if any source is missing.

# Review reports/audit/source-match-report.md.
# If the report lists "Safe replacement suggestions":
npm run apply:source-matches              # dry-run (default; no files modified)
npm run apply:source-matches -- --write   # apply replacements and write a backup

# After applying, refresh the ledger and audit:
npm run init:ledger
npm run audit:data
npm test
npm run build
```

## Match statuses

The matcher returns one of five statuses per reading:

- **`exact_word_index_match`** — the source's token at the same `wordIndex` is byte-identical to the reading. The strongest signal.
- **`exact_elsewhere_in_ayah`** — the reading is byte-identical to _some_ token in the source ayah, but not at the expected index. Tokenisation may differ across distributions; reviewer judgement required.
- **`ayah_present_but_no_exact_match`** — the source has the verse, but no token in it is byte-identical. The reading is either wrong or the source uses a different orthographic convention.
- **`ayah_missing`** — the verse isn't in the source at all (e.g. a corpus that only covers selected verses).
- **`source_not_applicable`** — no corpus available for this riwayah.

The matcher also computes a **diagnostic** comparison block (using `stripDiacritics` and `normalizeRasm`) for cases that aren't byte-identical. The diagnostic is informational only — it never authorises a source substitution. It's there so a reviewer can immediately see whether a near-miss is a diacritic-only difference or a real divergence.

## Why `apply-source-matches` is so conservative

The applier has six guards stacked on top of each other before it changes a single byte:

1. The reading must currently be flagged `manual_placeholder`.
2. The match status must be `exact_word_index_match`. `exact_elsewhere_in_ayah` is _not_ enough — token alignment differences indicate either a real disagreement or a spurious match.
3. The matched corpus must be `kfqpc-warsh` or `kfqpc-qalun` (Tanzil already supplies the Hafs base text; we don't auto-replace Hafs sources).
4. The corpus's riwayah must equal the reading's riwayah.
5. The matched text must be byte-identical to the reading text.
6. The proposed source id must already exist in `dataset.sources`.

Even when all six guards pass, the script changes nothing without `-- --write`. The default is dry-run, and the write path always produces a backup at `src/data/quranData.before-source-apply.json` before modifying the live file. The script never touches Arabic text, never changes `confidence`, and never sets anything to `verified`. Promotion remains the reviewer's job.

## Report tracking

`source-match-report.md` and `source-match-report.json` are git-**ignored** by default because they reflect the user's local corpora — two reviewers with slightly different upstream files would otherwise produce conflicting reports. If you have a reproducible corpus (pinned via `expectedHash` in `sourceManifest.json`), you can commit a snapshot manually. The corresponding audit reports (`quran-data-audit.{md,json}`) remain tracked because they don't depend on external corpora.

## Manual data download (when fetcher is blocked)

If `npm run fetch-data` cannot reach Tanzil (the canonical download URL gates behind a license-acceptance form):

1. Visit https://tanzil.net/download/, choose "Uthmani Text (with simple symbols)", and accept the terms.
2. Save as `scripts/_raw/quran-uthmani.txt`.
3. The KFGQPC mirrors should still be reachable; if not, place the JSON files at `scripts/_raw/kfqpc-warsh.json` and `scripts/_raw/kfqpc-qalun.json`.
4. Run `npm run build-variants`.

## Related documents

- [docs/decisions/0001-sacred-text-integrity-policy.md](decisions/0001-sacred-text-integrity-policy.md) — the integrity invariants this workflow respects.
- [docs/decisions/0002-canonical-dataset-and-ledger.md](decisions/0002-canonical-dataset-and-ledger.md) — why dataset and verification ledger are separate.
- [docs/decisions/0003-source-authority-levels.md](decisions/0003-source-authority-levels.md) — the formal authority-level ADR.
- [docs/planning/phase-6-official-source-acquisition.md](planning/phase-6-official-source-acquisition.md) — the open work to upgrade local corpora to `official_confirmed`.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — the scholarly verification workflow that follows source matching.

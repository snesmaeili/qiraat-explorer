# Phase 6 — Official Source Acquisition and Scholar Verification Preparation

## Goal

Obtain official, provenance-documented corpora for the three source datasets (Tanzil Hafs, KFGQPC Warsh, KFGQPC Qalun) so that `authorityStatus` can be upgraded from `unknown` to `official_confirmed`. Once provenance is established, prepare the first scholar review packet for the 8 curated variant groups.

## Non-goals

- Do not add new qira'at data or new verses.
- Do not generate Arabic text.
- Do not modify existing Arabic text in `quranData.json`.
- Do not promote any reading to `confidence: verified` without human scholar review.
- Do not commit raw corpus files to the repository.
- Do not make the repository public.

## Required official corpora

| Corpus key            | Source                                     | Expected format          | Current status             |
| --------------------- | ------------------------------------------ | ------------------------ | -------------------------- |
| `tanzil-hafs-uthmani` | [Tanzil.net](https://tanzil.net/download/) | Line-per-ayah UTF-8 text | `authorityStatus: unknown` |
| `kfgqpc-warsh`        | [KFGQPC](https://qurancomplex.gov.sa/)     | JSON                     | `authorityStatus: unknown` |
| `kfgqpc-qalun`        | [KFGQPC](https://qurancomplex.gov.sa/)     | JSON                     | `authorityStatus: unknown` |

## Download procedure

The preferred method is automated download via `npm run fetch-data`, which populates `scripts/_raw/` from documented upstream URLs. For each corpus:

1. Run `npm run fetch-data` to download all configured sources automatically.
2. If a source requires manual license acceptance (e.g., Tanzil gates downloads behind a browser form), the script will log a warning. In that case, visit the URL, accept terms, and save the file to `scripts/_raw/` manually.
3. Record the exact URL used, the date, and the download method in a provenance note.
4. Run `npm run record:provenance` to hash the file and compare against any previous hash.

The key provenance requirement is **documentation** — the retrieval URL, method, date, and hash must all be recorded regardless of whether the download was automated or manual.

## Provenance fields required before authorityStatus can change

Before a source entry in `sourceManifest.json` can be changed from `authorityStatus: unknown` to `authorityStatus: official_confirmed`, **all** of the following fields must be documented:

- `retrievalMethod`: How the file was obtained (e.g., `manual_browser_download`).
- `retrievalUrl`: The exact URL from which the file was downloaded.
- `expectedHash`: The SHA-256 hash of the downloaded file.
- `isCompleteCorpus`: Whether this is the full corpus or a subset.
- `corpusScope`: One of `full_quran`, `sample_subset`, `sufficient_for_curated_sample`, or `unknown`.
- `licenseNote`: Confirmation that license terms were accepted.
- `canCommitRawFile`: Must remain `false` unless redistribution is explicitly permitted.

## Hashing procedure

```bash
npm run record:provenance
```

This script:

1. Reads each local file listed in `sourceManifest.json`.
2. Computes a SHA-256 hash.
3. Writes metadata (hash, size, existence, timestamp) to `reports/audit/source-provenance.json`.
4. Does **not** copy any Arabic text into the provenance report.

After downloading a new official corpus, compare the hash against any previously recorded hash. If hashes differ, investigate before proceeding.

## License notes

- **Tanzil**: Requires accepting terms at https://tanzil.net/download/. Attribution required. No modification of text. Redistribution of the raw file is not permitted without explicit agreement.
- **KFGQPC**: Files published by the King Fahd Glorious Qur'an Printing Complex. Attribution to KFGQPC required. Raw files should not be redistributed without confirming KFGQPC terms.
- All raw corpus files remain in `scripts/_raw/` (git-ignored) and are never committed.

## Review workflow

Once `authorityStatus` is upgraded to `official_confirmed` for a corpus:

1. Re-run `npm run match:sources`. Exact matches against the confirmed corpus will now produce `replacementEligibility: eligible_source_id_replacement`.
2. Run `npm run apply:source-matches` in dry-run mode first to review proposed changes.
3. If the dry-run output is correct, run `npm run apply:source-matches -- --write` to replace `manual_placeholder` source IDs.
4. Run `npm run init:ledger` to refresh the ledger with updated source references.
5. Run `npm run audit:data` and `npm test` to confirm integrity.
6. Commit the updated dataset, ledger, and audit reports together.

Scholar verification (upgrading `confidence` from `curated_sample` to `verified`) is a separate, subsequent step that requires a human reviewer working through the verification checklist in `CONTRIBUTING.md`.

## Acceptance criteria

- [ ] Each corpus has a documented `retrievalUrl` and `retrievalMethod`.
- [ ] Each corpus has a verified `expectedHash` matching the downloaded file.
- [ ] `authorityStatus` is `official_confirmed` for all three corpora.
- [ ] `npm run match:sources` reports `eligible_source_id_replacement` for exact matches.
- [ ] `manual_placeholder` count drops from 12 to 0 after applying confirmed matches.
- [ ] `npm run audit:data` passes with 0 hard errors.
- [ ] All tests pass.
- [ ] Build passes.
- [ ] No raw corpus files are committed.

## Risks

- **License ambiguity**: KFGQPC distribution terms may not explicitly permit local use for research tooling. Confirm before upgrading `authorityStatus`.
- **Corpus version drift**: The official distribution may be updated over time. Pin the exact version via `expectedHash` and document the retrieval date.
- **Duplicate hash issue**: Current Warsh and Qalun local files share an identical SHA-256, indicating they are test fixtures. Official downloads will resolve this — the hashes should differ for genuine Warsh vs. Qalun corpora.
- **Subset vs. full corpus**: Confirm whether downloaded files cover the full Qur'an or only selected surahs/ayahs.

> **Important: GitHub mirrors are not automatic official provenance.**
>
> GitHub mirrors of KFGQPC data are useful for tests and diagnostics, but they are not automatically official provenance. To mark a source as `official_confirmed`, we need either:
>
> - Direct KFGQPC download/provenance (file obtained from https://qurancomplex.gov.sa/ or its documented distribution channels), or
> - Documented institutional/source-chain justification approved by the research team.
>
> Citing a third-party GitHub mirror alone is insufficient.

## GitHub issues to create manually

### Issue 1

**Title:** Document official source acquisition procedure for Tanzil Hafs
**Body:** Record the exact retrieval URL, download method, license acceptance date, and SHA-256 hash for `scripts/_raw/quran-uthmani.txt`. Update `sourceManifest.json` fields: `retrievalMethod`, `retrievalUrl`, `expectedHash`, `isCompleteCorpus`, `corpusScope`.

### Issue 2

**Title:** Document official source acquisition procedure for KFGQPC Warsh
**Body:** Record the exact retrieval URL, download method, license acceptance date, and SHA-256 hash for `scripts/_raw/kfqpc-warsh.json`. Update `sourceManifest.json` fields: `retrievalMethod`, `retrievalUrl`, `expectedHash`, `isCompleteCorpus`, `corpusScope`.

### Issue 3

**Title:** Document official source acquisition procedure for KFGQPC Qalun
**Body:** Record the exact retrieval URL, download method, license acceptance date, and SHA-256 hash for `scripts/_raw/kfqpc-qalun.json`. Update `sourceManifest.json` fields: `retrievalMethod`, `retrievalUrl`, `expectedHash`, `isCompleteCorpus`, `corpusScope`.

### Issue 4

**Title:** Replace unknown authorityStatus only after full provenance is documented
**Body:** Do not change `authorityStatus` from `unknown` to `official_confirmed` until `retrievalUrl`, `retrievalMethod`, `expectedHash`, file size, and license acceptance are all recorded. Guard this in the match-sources script and in review.

### Issue 5

**Title:** Create first scholar review packet for the 8 curated variant groups
**Body:** Prepare a review document listing each of the 8 `VariantGroup` entries with their readings, sources, and citations. The reviewer should verify each Arabic string character-for-character against the cited primary source (an-Nashr, at-Taysir, or Hirz al-Amani).

### Issue 6

**Title:** Design reviewer-facing verification form or checklist
**Body:** Create a structured form or checklist that a qira'at scholar can use to verify individual readings. Include fields for: reading text confirmed (yes/no), source located (yes/no), page/section reference, reviewer initials, date, notes, and whether the attribution chain is correct.

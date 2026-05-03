# Qira'at Explorer

A prototype web application for visualizing textual variants across the canonical recitation traditions (_qirāʾāt_) of the Qur'an. The user picks a verse, toggles which transmissions (_riwāyāt_) to overlay against Ḥafṣ ʿan ʿĀṣim, and the app highlights words that differ — clicking any highlighted word reveals every alternate reading, with reciter, transmitter, and source attribution.

> **Status: prototype.** This codebase implements the core architecture and ships with a hand-curated dataset of ~10 verified variant points spread across the Qur'an. A fetcher script (`scripts/fetch-data.js`) is provided to pull and align the full Tanzil + KFGQPC corpora into the same data shape, but running it produces machine-aligned diffs that should be reviewed by a qira'at specialist before being treated as authoritative.

---

## Quick start

```bash
git clone <this-repo>
cd qiraat-explorer
npm install
npm run dev          # opens http://localhost:5173
```

```bash
npm test             # vitest run, ~30 unit tests
npm run build        # production build
```

To extend the curated sample to the full Qur'an:

```bash
npm run fetch-data   # downloads Tanzil + KFGQPC sources to scripts/_raw/
npm run build-variants # word-aligns and writes src/data/fullVariants.json
```

The app loads `fullVariants.json` if present and falls back to the hand-curated `sampleVariants.json` otherwise.

---

## What is a _qirāʾa_?

The Qur'an has been transmitted through ten canonical recitations, each going back to one of the seven (or ten, in the broader scheme) "readers" (_qurrāʾ_) of the early Islamic centuries. Each _qārī_ in turn has multiple _rāwīs_ (transmitters); a _qirāʾa-by-rāwī_ combination is called a _riwāya_. Worldwide most printed Qur'ans use **Ḥafṣ ʿan ʿĀṣim** (Ḥafṣ's transmission of ʿĀṣim al-Kūfī), but **Warsh ʿan Nāfiʿ** dominates in much of North and West Africa, and **Qālūn ʿan Nāfiʿ** is common in Libya and Tunisia.

The _qirāʾāt_ differ in three categories that this app makes visible:

| Type                     | Example                                                | Visible in print?       |
| ------------------------ | ------------------------------------------------------ | ----------------------- |
| **Rasm** (skeletal text) | Q 2:132 وَوَصَّى (Ḥafṣ) vs وَأَوْصَى (Warsh)           | Yes — different letters |
| **Diacritic** (vowels)   | Q 5:6 وَأَرْجُلَكُمْ (fatḥa) vs وَأَرْجُلِكُمْ (kasra) | Yes — different harakāt |
| **Phonetic**             | Q 1:7 ʿalayhim (Ḥafṣ) vs ʿalayhum (Ḥamza)              | Yes — different harakāt |

The first two are encoded differently in Unicode and in the source datasets; the third is also marked in modern Mushafs by the choice of fatḥa/ḍamma/kasra.

---

## Architecture

```
[ User ] ──▶ React UI (Vite)
              │
              ├── ControlPanel (verse + riwāya selection)
              ├── VerseDisplay → WordToken[] → VariantTooltip
              └── Legend / ShapingBadge
                       │
              variantLookup.js (compute per-word state)
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
   sampleVariants.json     fullVariants.json (optional)
   (hand-curated, MIT)     (built from Tanzil + KFGQPC)
                                  ▲
                                  │
                       scripts/build-variants.js
                       scripts/fetch-data.js
                                  ▲
                                  │
                  Tanzil (Hafs)   KFGQPC (Warsh, Qalun)

  shaping.js: harfbuzzjs (WASM) ─[fail]→ browser-native fallback
```

See `docs/architecture.mmd` for the formal Mermaid diagram and `docs/timeline.mmd` for the 6-month Gantt.

### Module layout

```
src/
├── App.jsx                    # top-level state + composition
├── main.jsx                   # React entry point
├── components/
│   ├── ControlPanel.jsx       # surah/ayah picker + riwāya toggles + curated list
│   ├── VerseDisplay.jsx       # the verse; owns tooltip-open state
│   ├── WordToken.jsx          # single word; carries highlight class & a11y
│   ├── VariantTooltip.jsx     # readings grouped by form, with citations
│   ├── Legend.jsx             # color key
│   └── ShapingBadge.jsx       # shows whether HarfBuzz or fallback is active
├── data/
│   ├── quranMeta.json         # 114 surahs + riwāyāt registry
│   ├── sampleVariants.json    # curated, hand-verified variant data
│   └── fullVariants.json      # (optional) machine-built corpus
├── lib/
│   ├── arabic.js              # diacritic/rasm normalization, classification
│   ├── alignment.js           # Needleman-Wunsch over words
│   ├── shaping.js             # harfbuzzjs wrapper with native fallback
│   └── variantLookup.js       # async getVerse + computeWordStates
└── styles/app.css

scripts/
├── fetch-data.js              # download Tanzil + KFGQPC into _raw/
└── build-variants.js          # align & emit src/data/fullVariants.json

tests/                         # vitest suites covering arabic, alignment,
                               # variantLookup, and React components
docs/
├── architecture.mmd           # Mermaid flowchart
└── timeline.mmd               # Mermaid Gantt
```

### Text shaping

Arabic shaping is delegated to **`harfbuzzjs`** (HarfBuzz compiled to WebAssembly) when it loads successfully. The shaper is wrapped in `src/lib/shaping.js` behind a uniform `shape(text)` API. If the WASM fails to load — most commonly because the Qur'anic font isn't placed in `public/fonts/` — the wrapper falls back to _browser-native_ shaping (the browser's built-in OpenType engine). The badge in the header shows which mode is active.

This dual-mode approach satisfies the spec's "fail gracefully" requirement: nothing depends on HarfBuzz being available; it's used to **measure** advance widths and inspect which OpenType features fired, not to render.

---

## Data sources & licensing

| Data                          | Source                                                                                                                         | License / terms                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Ḥafṣ Uthmānic text**        | [Tanzil.net](https://tanzil.net/)                                                                                              | Tanzil license — attribution required, no modification of text. Download requires accepting terms on the site. |
| **Warsh JSON**                | [KFGQPC](https://qurancomplex.gov.sa/) via [thetruetruth/quran-data-kfgqpc](https://github.com/thetruetruth/quran-data-kfgqpc) | KFGQPC's published files; attribution to the King Fahd Glorious Qur'an Printing Complex.                       |
| **Qālūn JSON**                | KFGQPC, same mirror                                                                                                            | as above                                                                                                       |
| **Variant attributions**      | Ibn al-Jazarī, _an-Nashr fī al-qirāʾāt al-ʿashr_; ad-Dānī, _at-Taysīr_; ash-Shāṭibī, _Ḥirz al-Amānī_                           | Public domain. Citations included in tooltips.                                                                 |
| **Cross-reference**           | [Corpus Coranicum](https://corpuscoranicum.de/)                                                                                | Variant entries cross-referenced where listed; consult their terms.                                            |
| **KFGQPC Hafs Uthmanic font** | KFGQPC                                                                                                                         | **Not bundled.** See "Font installation" below.                                                                |

The application code is licensed **MIT** (see `LICENSE`). All Qur'anic text comes from upstream sources and retains its source license; **no Arabic text in this repository was generated by AI**.

### Font installation

The KFGQPC fonts have a separate license. To use them with the app:

1. Download `KFGQPC HAFS Uthmanic Script Regular.ttf` from [the KFGQPC page](https://fonts.qurancomplex.gov.sa/) (terms posted there).
2. Place the file at `public/fonts/KFGQPC-HafsUthmanic.ttf`.
3. Restart the dev server — the badge should switch from "Native shaping (fallback)" to "HarfBuzz WASM" if `harfbuzzjs` is installed.

If you skip this step the app still runs — the browser falls back to whatever Arabic font is installed on the user's system.

### Manual data download (when fetcher is blocked)

If `npm run fetch-data` cannot reach Tanzil (the canonical download URL gates behind a license-acceptance form):

1. Visit https://tanzil.net/download/, choose "Uthmani Text (with simple symbols)", and accept the terms.
2. Save as `scripts/_raw/quran-uthmani.txt`.
3. The KFGQPC mirrors should still be reachable; if not, place the JSON files at `scripts/_raw/kfqpc-warsh.json` and `scripts/_raw/kfqpc-qalun.json`.
4. Run `npm run build-variants`.

---

## Acceptance criteria — coverage

| Criterion                                               | Status                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Highlights all qira'at variants in sample verses        | ✓ For curated sample (1:4, 1:6, 1:7, 2:9, 2:10, 2:132, 3:146, 5:6)       |
| Shows variant readings on click with source attribution | ✓ Tooltip lists every reading, transmitter, region, and citation         |
| Runs on Chrome/Firefox                                  | ✓ Standard ES2020+, no platform-specific APIs                            |
| Graceful fallback when HarfBuzz WASM unstable           | ✓ `lib/shaping.js` falls back to browser-native; badge surfaces the mode |
| Mermaid architecture + timeline diagrams                | ✓ `docs/architecture.mmd`, `docs/timeline.mmd`                           |
| Code clean, modular, properly licensed                  | ✓ MIT; data sources respected per their licenses                         |
| Self-contained — no proprietary services                | ✓ All data loads from local JSON; fetcher is opt-in                      |
| Unit-tested verse alignment + variant detection         | ✓ ~30 tests in `tests/`; explicit coverage of 2:9, 1:4, 5:6              |

---

## How variants are computed

For each verse the dataset stores:

- The Ḥafṣ tokenization (`hafs.tokens`, an array of `{ text }`).
- A list of `variants`, each pointing at a `wordIndex` in that tokenization and listing every documented reading (`{ riwaya, label, text, translit, gloss, source }`) plus narrative `notes` and `citations`.

At render time `computeWordStates(verse, activeRiwayat)`:

1. Builds a map `wordIndex → variant`.
2. For each Ḥafṣ token, looks up the variant (if any).
3. Filters readings to those (a) belonging to a currently-active riwāya and (b) whose text differs from Ḥafṣ.
4. Returns `[{ index, text, variant?, activeAlternates[] }]`.

A word is rendered as a button (`role="button"`) only when `activeAlternates.length > 0`. The CSS class is keyed on `variant.type` (`rasm` → red, `diacritic` → blue, `phonetic` → amber dashed) — this is what produces the legend's color codes.

---

## Sacred Text Integrity Policy

The Qur'an is sacred text. This project's first obligation is to its readers: when the app shows you "Warsh reads X here", that string must be a faithful copy of what Warsh actually transmits, not a guess, not a model output, not a synthesis. The following invariants are **non-negotiable** and are enforced by the `tests/integrity.test.js` suite.

1. **No AI generation of Qur'anic Arabic, anywhere, ever.** No part of the runtime, the build pipeline, or the test suite produces Arabic text by inference. Every Arabic string the user sees originates in `src/data/quranData.json`, which itself is sourced from Tanzil, KFGQPC, or the classical qira'at literature. The data file carries `_meta.generated = false` and `_meta.generationPolicy = "no-arabic-text-generation"` as a tripwire; if either flag flips, the data loader throws on import.
2. **All readings come from source data.** Every `VariantReading` carries a `source: SourceCitation.id` field. The legal source ids are listed in `bundle.sources`; an unknown source id fails the integrity test. The placeholder id `manual_placeholder` is reserved for entries that have not yet been cross-checked, and its presence forces `confidence: needs_review` (or `curated_sample` for acknowledged-incomplete entries).
3. **Display text is immutable.** The data loader deep-freezes every `Ayah`, `VerseText`, `WordToken`, and `VariantGroup` at module load. Attempting to assign to any field throws in strict mode (which Vite enables by default for ES modules). The diff engine `diffByCuratedVariants` is a pure function: tests assert that running it leaves the input JSON byte-identical.
4. **Normalisation never modifies the original.** `stripDiacritics` and `normalizeRasm` always return fresh strings. They are used only for _comparison_ (Needleman-Wunsch alignment, rasm-equality predicates) — never for rendering. The `<WordToken>` component renders `token.text` verbatim, end of story.
5. **LLMs may help with code and metadata structure only.** When this codebase is updated by a language-model-assisted workflow, the model may write JavaScript, JSDoc types, tests, CSS, and English-language documentation. It MAY NOT author or "complete" any Arabic verse text. Variant readings, transliterations, and glosses must be added by a human editor citing a primary source.
6. **Uncertain variants are flagged.** Every `VariantGroup` carries `confidence`: one of `curated_sample` (representative example, not exhaustive), `verified` (cross-checked against a primary source by a reviewer), or `needs_review` (machine-imported, awaiting human review). The UI renders this label as a badge in the variant panel. Anything sourced as `manual_placeholder` is automatically rendered as either `curated_sample` (if acknowledged) or `needs_review`.

These rules apply equally to internal branches, automated import scripts, and any future schemas. If you can't trace a string back to a SourceCitation, it doesn't ship.

---

## Verification Workflow

The project separates **what the dataset claims** from **what a human reviewer has verified**. This is the heart of how Qira'at Explorer becomes ready for scholarly use.

**Two files, two purposes.**

- `src/data/quranData.json` is the curated source data: token-segmented verse text, variant groups, and reading attributions. Each `VariantGroup` carries a `confidence` label (`curated_sample`, `verified`, or `needs_review`) — this is the _display trust_ the runtime renders to the user via the audit badge in the header.
- `src/data/verificationLedger.json` is the **review workflow** layer. It contains one `VerificationRecord` per `VariantReading`, tracking who has reviewed it and what they concluded. The ledger never replaces the dataset's `source` field; it lives alongside it as an auditable trail.

**`confidence` and `VerificationStatus` are related but not identical.** Confidence is a property of a variant group in the dataset; it controls what the user sees. Verification status is a property of an individual reviewer-tracked record in the ledger; it tracks the review process. A group should only be promoted to `confidence: verified` once **every** reading in it has a corresponding `VerificationRecord` with `status: scholar_verified` (or `text_matched` at minimum) and no `manual_placeholder` source ids remain.

**The audit script enforces this.** The script `scripts/audit-data.js` cross-checks the dataset and ledger and emits two reports under `reports/audit/`:

- `quran-data-audit.md` — human-readable snapshot (tracked in git)
- `quran-data-audit.json` — full machine-readable audit (tracked)

It exits with a non-zero code if and only if it detects a _hard_ integrity error: missing or unknown source id, unknown riwayah, invalid `wordIndex`, a `VariantGroup` without a base reading, or a `confidence: verified` group that still references a `manual_placeholder` source. Soft warnings — empty ledger, curated_sample groups, unreviewed records, drifted text hashes — surface in the Markdown report but don't fail the audit.

### Day-to-day commands

```bash
npm run init:ledger     # create or refresh stubs in verificationLedger.json
npm run audit:data      # write reports/audit/quran-data-audit.{md,json}
                        # exits 1 on hard integrity errors
npm test                # run the full vitest suite (includes integrity + audit)
```

`init:ledger` is **idempotent and review-safe**. Re-running it after the dataset changes refreshes the dataset-derived fields (`readingText`, `textHash`, `source`, `surah`/`ayah`/`wordIndex`) but never overwrites reviewer-owned fields (`status`, `reviewer`, `reviewedAt`, `notes`, `evidenceLink`, `sourceReference`). If a previously-verified record's `textHash` no longer matches the current dataset, the script auto-downgrades it from `scholar_verified` to `needs_correction` with a note explaining the drift, so a reviewer must re-confirm.

### How a scholar verifies one reading

For each `VerificationRecord` you intend to promote:

1. **Locate the source.** Open the cited primary source — typically Ibn al-Jazarī's _an-Nashr_, ad-Dānī's _at-Taysīr_, or ash-Shāṭibī's _Ḥirz al-Amānī_ — at the page/section the dataset records. If the source id is `manual_placeholder`, replace it with a real `SourceCitation` id from `bundle.sources` first.
2. **Compare the exact Arabic text.** Read the variant character-for-character against the source. Diacritics matter: a fatḥa where the source shows a kasra is a _different reading_, not a typo.
3. **Update `source` / `sourceReference` if needed.** If the dataset's source id was wrong or imprecise, edit it in `quranData.json` (and the corresponding ledger record's `source` will refresh on the next `init:ledger`).
4. **Update the ledger record** in `verificationLedger.json`:
   - set `status` to `text_matched` if the Arabic agrees, or `scholar_verified` if you're qualified to attest to the broader attribution and chain
   - fill in `reviewer` (your initials or handle), `reviewedAt` (ISO date), and `notes`
   - optionally fill in `evidenceLink` with a URL or file path to a scan/photo of the cited source
5. **Promote `confidence: verified` only if appropriate.** Once every reading in a `VariantGroup` is at minimum `text_matched`, you may flip the group's `confidence` from `curated_sample` (or `needs_review`) to `verified` — but only if no reading in that group still uses `manual_placeholder`. The audit script will fail loudly if you violate this rule.
6. **Re-run `npm run audit:data`** and commit the updated dataset, ledger, and refreshed audit report together.

### Why this is structured the way it is

Three principles drove the design.

The first is _separation of concerns_. The dataset is what the runtime displays; the ledger is what a reviewer manages. Mixing them would mean a reviewer's fingerprint sat next to sacred text, and dataset edits would conflict with review workflow. Keeping them separate also means the ledger can be backed by a richer system later (a database, a review tool) without changing the runtime.

The second is _immutability of sacred text_. The dataset loader deep-freezes every Ayah and WordToken at module load. The audit utilities and ledger init script copy `readingText` strings verbatim and never transform them. The `textHash` field is how we detect _drift_ — if anyone ever does mutate a reading, every existing ledger record for that reading flags itself stale.

The third is _no automated promotion_. There is no code path anywhere in the project that changes `confidence` to `verified` automatically. The integrity tests (`tests/integrity.test.js`) assert that any group claiming `verified` cannot contain a `manual_placeholder` reading, and the optional machine-built `fullVariants.json` is never allowed to claim `verified`. Promotion is a human action, with a human signature in the ledger.

---

## Source Matching Workflow

The verification workflow described above asks "has a human reviewer attested to this reading?". The **source matching** workflow asks the prior, mechanical question: "does the Arabic text in `quranData.json` match a legally-obtained external corpus, character-for-character?" An exact match cannot replace human judgement, but it CAN justify swapping a `manual_placeholder` source id for a real one, because the reading is now traceable to a recorded line of an upstream file.

**Source matching is not scholar verification.** A byte-for-byte match against KFGQPC Warsh proves the text agrees with that distribution; it does not prove the variant is correctly attributed across the qira'at literature. Promotion to `confidence: verified` still requires a human reviewer working through the steps in "Verification Workflow" above. Source matching narrows the gap; it does not close it.

**The repo does not bundle raw Qur'an corpora.** Tanzil and KFGQPC distributions have their own license terms, and shipping them inside this repository would be redistribution. The user obtains them under those licenses and places the files locally:

- Tanzil Hafs Uthmani text → `scripts/_raw/quran-uthmani.txt` (download requires accepting Tanzil terms at https://tanzil.net/download/)
- KFGQPC Warsh JSON → `scripts/_raw/kfqpc-warsh.json`
- KFGQPC Qālūn JSON → `scripts/_raw/kfqpc-qalun.json`

The `scripts/_raw/` directory is git-ignored. The declared corpora live in `src/data/sourceManifest.json` along with the upstream URL, license note, expected file hash (optional), and parser format.

### Source provenance and raw corpus policy

- raw corpora are not committed
- `scripts/_raw/` is local only
- `source-provenance.json` stores only hashes and metadata
- source matching is reproducible only if the same local files are available
- exact match is not scholar verification
- replacing `manual_placeholder` with `kfqpc-warsh`/`kfqpc-qalun` means “matched local source corpus”, not “scholar_verified”
- confidence remains `curated_sample` until human review

### Source authority levels

The provenance of local files determines whether an exact match can authorize replacing `manual_placeholder` with a definitive source ID.

- **`unknown` / `downloaded_unverified`**: Unknown local files cannot justify replacing source IDs. Exact match against an unconfirmed file is not official provenance.
- **`local_fixture`**: Fixtures are subsets used for testing only. They cannot change source IDs.
- **`official_confirmed`**: Requires a documented retrieval URL, retrieval method, file hash, and license. If an exact match occurs against an officially confirmed corpus, `manual_placeholder` may be replaced by the matching `sourceId`.
- **`scholar_confirmed`**: Requires documented human review and independent verification.
- `manual_placeholder` should remain in the dataset until the source authority is sufficient (`official_confirmed` or higher).

Source matching is a diagnostic step, not an automatic claim of authority.

### Day-to-day commands

```bash
npm run match:sources              # exact-match each reading against any
                                    # local corpora; produces report.
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

### Match statuses

The matcher returns one of five statuses per reading:

- `exact_word_index_match` — the source's token at the same `wordIndex` is byte-identical to the reading. The strongest signal.
- `exact_elsewhere_in_ayah` — the reading is byte-identical to _some_ token in the source ayah, but not at the expected index. Tokenisation may differ across distributions; reviewer judgement required.
- `ayah_present_but_no_exact_match` — the source has the verse, but no token in it is byte-identical. The reading is either wrong or the source uses a different orthographic convention.
- `ayah_missing` — the verse isn't in the source at all (e.g. a corpus that only covers selected verses).
- `source_not_applicable` — no corpus available for this riwayah.

The matcher also computes a **diagnostic** comparison block (using `stripDiacritics` and `normalizeRasm`) for cases that aren't byte-identical. The diagnostic is informational only — it never authorises a source substitution. It's there so a reviewer can immediately see whether a near-miss is a diacritic-only difference or a real divergence.

### Why `apply-source-matches` is so conservative

The applier has six guards stacked on top of each other before it changes a single byte:

1. The reading must currently be flagged `manual_placeholder`.
2. The match status must be `exact_word_index_match`. `exact_elsewhere_in_ayah` is _not_ enough — token alignment differences indicate either a real disagreement or a spurious match.
3. The matched corpus must be `kfqpc-warsh` or `kfqpc-qalun` (Tanzil already supplies the Hafs base text; we don't auto-replace Hafs sources).
4. The corpus's riwayah must equal the reading's riwayah.
5. The matched text must be byte-identical to the reading text.
6. The proposed source id must already exist in `dataset.sources`.

Even when all six guards pass, the script changes nothing without `-- --write`. The default is dry-run, and the write path always produces a backup at `src/data/quranData.before-source-apply.json` before modifying the live file. The script never touches Arabic text, never changes `confidence`, and never sets anything to `verified`. Promotion remains the reviewer's job.

### Report tracking

`source-match-report.md` and `source-match-report.json` are git-**ignored** by default because they reflect the user's local corpora — two reviewers with slightly different upstream files would otherwise produce conflicting reports. If you have a reproducible corpus (pinned via `expectedHash` in `sourceManifest.json`), you can commit a snapshot manually. The corresponding audit reports (`quran-data-audit.{md,json}`) remain tracked because they don't depend on external corpora.

---

## Roadmap: replacing curated_sample with verified data

The 8 verses currently in `src/data/quranData.json` are tagged `curated_sample` because they are illustrative, not exhaustive, and their per-riwayah text is constructed by substituting documented variant words into the Tanzil Hafs base — not pulled from an authoritative Warsh / Qālūn JSON. The roadmap to upgrade them to `verified` status:

1. **Pull canonical per-riwayah verse text.** Run `npm run fetch-data` on a machine with network access; this populates `scripts/_raw/` with Tanzil Hafs and the KFGQPC Warsh + Qālūn JSONs. Replace `manual_placeholder` source ids in the dataset with `kfqpc-warsh` / `kfqpc-qalun` once the fetched bytes are confirmed.
2. **Independent variant verification.** For each `VariantGroup`, an editor with access to a printed copy of an-Nashr (Ibn al-Jazarī) or at-Taysīr (ad-Dānī) cross-checks every reading text and reciter attribution. Once confirmed, flip the group's `confidence` from `curated_sample` to `verified` and add the verifier's initials + date to a separate audit log (out of scope for the data file itself).
3. **Phonetic-only variants.** Add a separate authoring pass for variants that don't surface in the rasm or in standard diacritic notation (imāla, ishmām, naql, idghām). These can't be auto-detected — they must be authored from an-Nashr against the audio recitations on EveryAyah.
4. **Verse-numbering reconciliation.** The Madanī, Kūfī, and Baṣrī ʿadd traditions disagree on where some verse boundaries fall. Add a `verseNumberingMap` table keyed by `(numberingScheme, surah, position)` so the app can label the same physical text by different ayah numbers depending on the user's selected tradition.
5. **Open-access publication.** Once the dataset is fully verified, mirror it under a permissive licence (CC0 for derivative annotations; the underlying Tanzil and KFGQPC text retain their upstream licences) so other projects can reuse the variant graph.

A six-month plan with two to three developers (see `docs/timeline.mmd`):

1. **Month 1.** Data pipeline: ingest Tanzil + KFGQPC for all 10 readings; design canonical JSON schema; align Hafs-vs-Warsh-vs-Qālūn at the word level.
2. **Month 2.** Hand-validation pass: a qira'at scholar reviews a sample for false positives/negatives in the alignment. Fix tokenization edge cases (e.g. Warsh's _naql_ writing).
3. **Month 3.** Phonetic-only variants (imāla, ishmām, idghām, etc.). These don't show up in word diffs and need to be authored from scratch against `an-Nashr`.
4. **Month 4.** UI polish: tooltip animations; keyboard navigation across words; export to PDF; permalinks.
5. **Month 5.** Audio: optionally sync with EveryAyah audio recitations so users can hear the variants.
6. **Month 6.** Hardening, accessibility audit (WCAG 2.1 AA), usability test with a Qur'anic scholar, public release.

---

## Contributing

This is a private academic research repository. Contributions are limited to the core research team until publication. The data files are intentionally formatted for line diffs — please don't reformat them. Variant additions require a citation that traces back to a published primary source (`an-Nashr`, `at-Taysīr`, `Ḥirz al-Amānī`, or a peer-reviewed academic edition). No verse text may be authored — only copied from a cited source dataset.

## License

Code: MIT. See `LICENSE`. Qur'anic text and variant data: see "Data sources & licensing" above.

# Long-Term Research Vision: Qurʾān Qirāʾāt Knowledge-Graph

> This document is the **broader research vision** that motivates Qira'at Explorer. The current React app (everything else in this repo) is the first deliverable of this larger plan. The roadmap below extends well past v0.1.x.

## Motivation

This project respects the artistic and textual heritage of the Qurʾān. As an Iranian researcher aware of how scripture can both unite and divide communities, I am motivated by the goal of rigorous transparency. This project treats the Qurʾān with scholarly care, gathering all canonical _riwāyāt_ (readings) and examining their variant _qirāʾāt_ (recitations) in context. We do not aim to fuel sectarian polemics, but to provide an open scholarly resource.

The Qurʾān contains 114 chapters (_surahs_) and 6,236 numbered verses (_ayāt_) in the standard Ḥafṣ ʿan ʿĀṣim arrangement. Variant recitations (Warsh, Qālūn, Dūrī, Sūsī, Shuʿbah, Bazzī, Qunbul, etc.) may group or number verses slightly differently. By building a unified corpus, we can document these differences and their historical impact on interpretation.

## Goals

1. **Collect data** — ingest authoritative Qurʾānic texts for all canonical riwāyāt and formats (Tanzīl, KFGQPC, Corpus Coranicum, Quranic Arabic Corpus).
2. **Normalize & align** — develop a data model that aligns verses and words across recitations, accounting for differences in verse counts (e.g. 6,236 vs 6,348 with bismi).
3. **Produce a Markdown vault** — export the normalized data as a Yorguin-style Markdown knowledge base (YAML front matter + wiki links), with one note per reading / surah / ayah / variant.
4. **HarfBuzz QA** — render each verse with HarfBuzz and capture snapshots to verify correct shaping.
5. **Variant analysis** — generate validation reports (ayah counts, checksums, mismatches) and prepare research analyses on how variants affect meaning or recitation practice.
6. **Transparency** — preserve all source attributions and license information; document the workflow end-to-end.
7. **AI-assisted validation** — use AI tools (e.g. Claude) to assist formatting or checks, but verify all content against primary sources.

## Terminology

| Term | Meaning |
|---|---|
| **Surah** | A chapter of the Qurʾān (114 total). |
| **Ayah** | A verse number in a surah. We use absolute `AyahID` (1–6236) for cross-referencing. |
| **Qirāʾa** | A canonical method of recitation. Each has a master (Ḥafṣ, Warsh, Nāfiʿ, etc.). |
| **Riwāya** | A specific transmitted version of a qirāʾa, named for a transmitter (e.g. Warsh ʿan Nāfiʿ, Qālūn ʿan Nāfiʿ). |
| **Rasm** | The skeletal consonantal text (Uthmānī script). Many manuscripts follow the Uthmanic rasm but add local orthographic variants. |
| **Mushaf** | A physical copy of the Qurʾān. We assume a fixed verse-pagination (e.g. Cairo 1924) for each riwāya. |
| **HarfBuzz (HB)** | An open-source text-shaping engine for Arabic and many other scripts. We use it to verify each verse renders correctly with complex script rules. |

## Data sources (prioritized)

| Source | Contents | License / notes |
|---|---|---|
| **Quran-meta** (JS lib) | Surah / juz / ayah metadata for many riwāyāt; handles `AyahID`, page, line numbering. | MIT; allows custom riwāyah injection. |
| **quran-data-kfgqpc** | Uthmānī script text from KFGQPC, multiple reciters (Ḥafṣ, Warsh, Qālūn, Dūrī, Shuʿbah, Sūsī, Bazzī, Qunbul). JSON / SQL. | KFGQPC published files; redistribution status to be confirmed before publishing derived data. |
| **Tanzil Project** | Verified Arabic text (Ḥafṣ ʿan ʿĀṣim, Uthmānī orthography). | CC BY 3.0 (no derivatives). Verbatim use only. License-acceptance gate at `tanzil.net/download/`. |
| **Corpus Coranicum** (TEI) | Critical dataset: text plus word-level variant readings, manuscript descriptions, concordance. | Academic project (BBAW), 2007–. Use under their terms. **TEI distribution gives transliteration with diacritics, not Arabic surface text** — the inner `<w xml:lang="ara"/>` elements in the variants TEI are self-closing in this dataset. Useful for reader/source attribution overlays; not byte-matchable against Arabic-text datasets. |
| **Quranic Arabic Corpus** | Morphologically annotated Qurʾān (word-by-word grammar and syntax). | License (verbatim, from `corpus.quran.com/download/`): _"Permission is granted to copy and distribute verbatim copies of this file, but CHANGING IT IS NOT ALLOWED."_ Stricter than vanilla GPL — **no derivatives**. Email-gate before download. |
| **QUL — Quranic Universal Library** (Tarteel) | Hafs-centric data hub: 132+ reciters with ayah-segmented timing, 209 translations, 115 tafsirs, 27 mushaf layouts, 28 Hafs script orthographies (Uthmani, Imlaei, IndoPak, Digital Khatt, glyph-based with tajweed), 77,429 morphology entries (a packaging of QAC's data). | CMS code MIT (TarteelAI/quranic-universal-library). Per-resource downloads sit behind JS-rendered buttons (static-HTML scrape returns `#_` placeholders); ingestion needs a small fetcher that drives the page. **Multi-qirāʾāt text data is NOT here** — only one explicitly non-Hafs reciter visible (Ali al-Huthaify Qaloon audio); KFGQPC remains the only path for Warsh/Qalun text. |
| **Uthmani Mushaf repos** | Additional Uthmanic-text sources for cross-checks of verse breaks. | Various (MIT / CC0 preferred). |
| **MarkItDown** | Tool to convert PDFs / Word / HTML of Qurʾānic prints into Markdown — useful for OCR scans of rare prints. | MIT (Microsoft). |
| **AI tools** (Claude) | Not a data source; used for formatting and validating outputs. Must always verify against primary sources. | Cannot serve as a "trusted authority." |

All usages must respect the source licenses.

## Repository layout (long-term)

| Directory | Purpose |
|---|---|
| `data/sources/` | Raw input files (JSON, XML, CSV, TEI) organized by source — `kfgqpc/`, `tanzil/`, `cc-variants/`, etc. |
| `src/` | Import adapters and normalization scripts. |
| `data/normalized/` | Aligned, schema-validated JSON / CSV records for all ayāt. |
| `vault/` | Yorguin-style Markdown notes, one per surah / ayah / riwāya / variant. |
| `fonts/` | Arabic fonts for HarfBuzz testing. |
| `qc/` | HarfBuzz rendering outputs (PNG snapshots) and QA reports. |
| `reports/` | Validation summaries and analysis outputs. |
| `docs/` | Design notes, ADRs, planning. |
| `.github/workflows/` | CI configurations. |

The current React app (`src/components`, `src/lib`, `tests/`) is the user-facing front end of this larger pipeline; the data layer it consumes (`src/data/quranData.json`) is the first product of the normalization step.

## Data model — example records

Unified verse record:

```json
{
  "riwaya": "Hafs_An_Asim",
  "surah": 2,
  "ayah": 5,
  "ayahId": 306,
  "text": "وَمِنَ ٱلنَّاسِ مَن يَشْرِي نَفْسَهُ...",
  "tokens": [
    { "token": "وَمِنَ", "lemma": "وَمِنَ", "wordIndex": 1 },
    { "token": "ٱلنَّاسِ", "lemma": "نَاس", "wordIndex": 2 }
  ],
  "verseChecksum": "abc123",
  "source": "quran-data-kfgqpc/hafs",
  "license": "Tanzil CC-BY-3.0",
  "page": 5,
  "line": 1,
  "notes": ""
}
```

Variant record aligned to an `AyahID`:

```json
{
  "ayahId": 306,
  "surah": 2,
  "ayah": 5,
  "variant": {
    "riwaya": "Warsh_An_Nafi",
    "text": "وَمِنَ ٱلْإِنسِ مَن يَشْرِي نَفْسَهُ...",
    "source": "CorpusCoranicum/quran_variants",
    "note": "Alternative word for 'people' (النَّاسِ / الإِنسِ)."
  }
}
```

## Workflow — ingestion & processing

1. **Ingestion.** Download or clone each data source into `data/sources/`. Use MarkItDown to convert non-JSON sources (PDFs, images, HTML) into JSON / Markdown.
2. **Normalization.** Per source, run a script to ensure consistent orthography (Unicode U+06xx blocks, no extraneous characters). Strip diacritics where needed for base-text comparison.
3. **Alignment.** Use the `ayahId` system (1–6236) to align verses. Handle special cases: surah 1 Bismillah counting, surah 9 (no Bismillah), riwāyāt that merge or split verses (record mapping rules).
4. **Word-level tokenization.** Segment each verse into words (and optionally morphemes), preserving indices. Use the Quranic Arabic Corpus lexicon as reference.
5. **Markdown export.** For each verse / riwāya, generate a Markdown note (Yorguin style) with YAML front-matter:

   ```markdown
   ---
   id: 306-2-5-Hafs_Asim
   surah: 2
   ayah: 5
   riwaya: Hafs_Asim
   tags: [Quran, Hafs, Verse]
   ---
   **Surah 2:5 (Ḥafṣ ʿan ʿĀṣim)**
   وَمِنَ ٱلنَّاسِ مَن يَشْرِي نَفْسَهُ...

   - *Source:* KFGQPC Hafs JSON (CC-BY, Tanzil)
   - *Verse checksum:* `abc123`
   - *Notes:* Verified against Tanzil SHA1.
   ```

   Use Markdown links for cross-references (e.g. `[[2:5-Hafs_Asim]]`).
6. **Consistency checks.** Compute verse and word checksums across sources. Report any mismatches or missing ayāt. Verify total verses count = 6236 in Ḥafṣ.
7. **QA reports.** Verse counts per riwāya, missing verses, duplicate keys, parsing errors.

Throughout, preserve provenance: each record notes its source and license. We do not "correct" variants — we record them.

## HarfBuzz rendering QA

HarfBuzz takes Unicode Arabic and a font and produces shaped glyph positions. The plan:

- Select representative Arabic fonts (Scheherazade, Lateef, Uthmanic) in OpenType.
- For each verse note, shape the text with `script="arab"`, `language="ara"`.
- Render to PNG (Cairo or similar) to catch rendering issues (ligature failures, missing glyphs).
- Capture snapshots and compare to reference glyph sequences.
- Verify Arabic joining (e.g. the `Allah` ligature, U+FDFA basmala variants).
- Regression in CI when a font update changes a rendering.

Steps:
- `hb-shape` each verse and compare glyph names against a reference.
- Visual diff for critical verses (e.g. basmala).
- Log missing glyphs or OpenType feature issues.
- Document which font file and size was used per riwāya.

## Ethical guidelines

- **Academic tone.** Variant readings are academic data, not arguments. Describe what differs, not which is "right."
- **Sensitivity.** Neutral on sectarian topics. Avoid phrasing like "mistake" or "corruption."
- **Provenance & licensing.** Cite sources for data. Do not violate copyright — use sources as permitted (Tanzil CC BY, QAC GPL, etc.).
- **AI use.** AI may help format or draft prose; every fact must be checked against primary sources. The AI is an assistant, not a final authority.
- **Community collaboration.** Encourage Islamicate scholars to review (GitHub Issues). Flag religious-content concerns.
- **Privacy.** No personal data is involved; respect contributor identities if they share notes.

## Research questions

- **Textual variants.** What kinds of differences appear among canonical readings (orthographic, hamzah position, long vowels, short vowels)? How frequent are they?
- **Interpretive impact.** Do any variants affect meaning or legal rulings (e.g. Warsh vs Ḥafṣ on particular words)?
- **Historical spread.** How did different riwāyāt become dominant in various regions (Ḥafṣ globally, Warsh in the Maghreb, etc.)?
- **Pedagogical uses.** Can a complete knowledge graph of variants help educators illustrate the Qurʾān's oral tradition?
- **Technical.** How best to align verses when one tradition combines or separates verses differently?
- **Bias avoidance.** Monitor that AI-assisted tools do not "hallucinate" textual content.

## Phased roadmap (long-term)

| Phase | Timeframe | Goal |
|---|---|---|
| **0** Setup | June 2026 | Repo scaffold; sample data (Ḥafṣ + Warsh); schema; vision README. |
| **I** Data collection | Jul–Aug 2026 | Adapters for Tanzil, KFGQPC, Corpus Coranicum, QAC. |
| **II** Normalization & alignment | Sep–Oct 2026 | Normalize texts; align verses (handle numbering); word-token alignment. |
| **III** Markdown export & QA | Nov–Dec 2026 | Yorguin-style vault; full HarfBuzz QA pipeline. |
| **IV** Analysis & reporting | Jan–Feb 2027 | Variant frequency charts; riwāya networks. |
| **V** Community review & publication | Mar 2027 | External scholar review; finalize CI; open release. |

## Testing & CI

- **Unit tests** — verse alignment, checksum calculation, e.g. Ḥafṣ surah count = 114, verse count = 6236.
- **Integration tests** — each source adapter reads known examples correctly.
- **Markdown linting** — generated notes meet style guidelines (YAML keys, wikilink format).
- **HarfBuzz regression** — CI flags shaping diffs.
- **Data validation** — no verse missing across `(surah, ayah, riwāya)` against `quran-meta` indices.

## Phase 0 next steps

- [ ] Initialize `data/`, `src/`, `vault/`, etc. with placeholder files.
- [ ] Download Ḥafṣ (Tanzil or KFGQPC) and one alternate (Warsh) to test the pipeline.
- [ ] Draft the unified JSON schema.
- [ ] Install `quran-meta` and reference surah / ayah counts.
- [ ] Trial MarkItDown on a PDF mushaf page.
- [ ] Assemble Uthmanic-style fonts (Scheherazade, Uthmanic).
- [ ] Update the vision doc with new decisions.

---

**Where this sits relative to the React app:** `qiraat-explorer` (the React/Vite UI in this repo) is **Phase 0's deliverable demo** — it proves the data model works end to end on a small curated sample (8 verses, 53 readings) and exercises HarfBuzz shaping in the browser. The phases above describe the corpus-scale work that the demo points toward.

---

## What this iteration delivered

Tracking what's actually in the repo today against the phased plan above.

- **Phase 0 — Hafs spine.** Tanzil full Hafs Uthmani corpus (1.4 MB, 6266 lines) is staged at `scripts/_raw/quran-uthmani.txt` with `authorityStatus: official_confirmed` in `src/data/sourceManifest.json`. The 8-verse curated dataset in `src/data/quranData.json` continues to be the runtime source of Arabic text.
- **Phase 1 — qirāʾāt readings.** KFGQPC Warsh + Qālūn JSONs are present locally (from a GitHub mirror) but `authorityStatus: downloaded_unverified` because local hashes don't match KFGQPC's published package hashes (see [docs/source-matching.md](source-matching.md) and `sourceManifest.json` `notes`). Direct re-download from `qurancomplex.gov.sa/quran-dev/` is the open work to upgrade them.
- **Phase 2 — Corpus Coranicum overlays.** Two pieces of CC data are now ingested under **CC BY-SA 4.0** from the official TEI export at [`telota/corpus-coranicum-tei`](https://github.com/telota/corpus-coranicum-tei):
  - [`scripts/extract-cc-variants.js`](../scripts/extract-cc-variants.js) → [`src/data/ccVariants.json`](../src/data/ccVariants.json): **231 variant entries** across the 8 curated verses, **870 readers indexed** (every canonical qārī plus shādhdh readings from companions and grammarians). Reader name + source id + word location + Latin transliteration. CC's TEI does not carry Arabic surface text in `<w xml:lang="ara"/>`, so this overlay is scholarly cross-reference rather than byte-matchable. `npm run build:cc-variants`.
  - [`scripts/extract-cc-manuscripts.js`](../scripts/extract-cc-manuscripts.js) → [`src/data/ccManuscripts.json`](../src/data/ccManuscripts.json): **2,323 manuscript msDesc records** parsed from the upstream `quran_manuscripts/` directory, of which **1,544** have a parseable date ≤ 1100 CE. Each entry carries shelfmark, repository, dating, dimensions, script class, provenance, verse coverage, and image-collection URLs (BL, Gallica, Cambridge CUDL, Bodleian, Walters, Qatar National). The `ManuscriptTimeline` view consumes the **71 "featured"** codices that have linked digital surrogates AND are dated ≤ 1000 CE; the other 1,473 entries remain in the file for cross-reference. The legacy 4-entry hand-written `manuscriptsData.json` was removed in favour of this. `npm run build:cc-manuscripts` (requires the sparse-cloned CC TEI repo at `scripts/_raw/cc-tei/`).
- **Phase 3 — audio.** Not started. QUL hosts 132+ Hafs reciters with ayah-level timing plus one Qālūn reciter (Ali al-Huthaify); ingestion requires a fetcher that drives QUL's JS-rendered download buttons. Documented as the next-most-likely audio source.
- **Phase 4 — sociolinguistic / geographic metadata.** Not started.
- **Phase 5 — ML-ready exports + stimulus libraries.** Not started.

The curated dataset (`quranData.json`) remains 8 verses / 53 readings / all `confidence: curated_sample`. Scholar verification (CONTRIBUTING.md) is the orthogonal track that promotes readings to `verified` and is independent of the corpus-breadth work above.

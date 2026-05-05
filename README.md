# Qira'at Explorer

A web app for exploring how the canonical recitations (_qirāʾāt_) of the Qur'an differ from one another — at the word, vowel, and rasm level — with every difference cited back to a primary source.

**Live demo:** `npm install && npm run dev`. **Stack:** React + Vite, ~190 KB JS, no backend.

---

## Why this exists

> As an Iranian researcher aware that scripture can both unite and divide communities, I built this for **rigorous transparency**. The goal isn't to argue one reading is more correct than another, or to feed any sectarian polemic. It's to provide an open, scholarly resource that documents the differences themselves — what they are, who transmitted them, and where they're attested in the classical literature — so anyone can see for themselves.

The Qur'an has been transmitted through ten canonical recitations, each going back to one of the early Islamic centuries' "readers" (_qurrāʾ_). Most printed Qur'ans worldwide use **Ḥafṣ ʿan ʿĀṣim**, but **Warsh ʿan Nāfiʿ** dominates much of North and West Africa. The differences between them are usually small — a vowel, a single letter, occasionally a whole word — but they're real, documented, and historically significant. This app makes them visible, with citations.

This repo is the working prototype of a larger plan; the long-form research vision lives in [`docs/research-vision.md`](docs/research-vision.md).

---

## What you get

Three views, switchable from the header:

- **Variant explorer.** Pick a verse, pick which readings to compare, see differing words highlighted by category (consonantal, vocalization, word-form, orthographic, verse-numbering). Click a highlighted word to see all alternates with reciter, transmitter, and source citation.
- **Morphology browser.** For sample verses, compares **QAC** and **Talmon** root / lemma / POS analyses side-by-side, highlighting where the two analyses disagree — useful for showing that disagreements about the text exist below the qirāʾāt level too.
- **Manuscript timeline.** Datings of early Qur'an codices plotted on a shared axis with a detail panel that links out to digital surrogates (BL, Gallica, Cambridge CUDL, Bodleian, Walters, Qatar National). Sourced from Corpus Coranicum's TEI msDesc export — 71 featured codices drawn from the 2,323-record upstream catalogue.

The bundled dataset is intentionally small — **8 verses, 53 readings, all flagged `curated_sample`** — and the verification work to scholarly-confirm each reading is the open phase. See [Status](#status) below.

---

## Quick start

```bash
git clone https://github.com/snesmaeili/qiraat-explorer.git
cd qiraat-explorer
npm install
npm run dev          # http://localhost:5173
```

```bash
npm test             # vitest, 128 tests
npm run build        # production build (~190 KB JS, ~14 KB CSS)
npm run audit:data   # cross-check dataset & verification ledger
```

To extend the curated sample with full upstream corpora (you'll need to accept Tanzil + KFGQPC license terms first):

```bash
npm run fetch-data         # downloads to scripts/_raw/ (git-ignored)
npm run build:hafs-corpus     # writes hafsCorpusData.json (git-ignored — KFGQPC)
npm run build-variants        # writes fullVariants.json (git-ignored)
npm run build:morphology      # refreshes morphologyData.json
npm run build:cc-variants     # parses scripts/_raw/quran_variants*.xml → ccVariants.json
npm run build:cc-manuscripts  # parses sparse-cloned CC TEI → ccManuscripts.json
```

`hafsCorpusData.json` and `fullVariants.json` are git-ignored because they're directly derived from upstream corpora whose redistribution licenses aren't yet confirmed. The smaller `morphologyData.json` and `manuscriptsData.json` samples are tracked.

---

## Terminology

| Term | Meaning |
|---|---|
| **Surah** | Chapter (114 in the Qur'an). |
| **Ayah** | Verse number within a surah. |
| **Qirāʾa** | A canonical method of recitation, traced to one of the early "readers" (e.g. ʿĀṣim, Nāfiʿ, Ibn Kathīr). |
| **Riwāya** | A specific transmitted version of a qirāʾa, named for the transmitter (e.g. Warsh ʿan Nāfiʿ, Ḥafṣ ʿan ʿĀṣim). |
| **Rasm** | The skeletal consonantal text (Uthmānī script). The earliest written form, before vowel marks. |
| **Mushaf** | A physical copy of the Qur'an. Pagination and vocalization conventions vary by mushaf. |
| **HarfBuzz** | An open-source text-shaping engine. Used here to verify Arabic glyph rendering. |

## What kinds of differences

| Type | Example | Visible in print? |
|---|---|---|
| **Rasm** (skeletal text) | Q 2:132 وَوَصَّى (Ḥafṣ) vs وَأَوْصَى (Warsh) | Yes — different letters |
| **Diacritic** (vowels) | Q 5:6 وَأَرْجُلَكُمْ vs وَأَرْجُلِكُمْ | Yes — different harakāt |
| **Phonetic** | Q 1:7 ʿalayhim vs ʿalayhum | Yes — different harakāt |

---

## Data sources

| Data | Source | License / terms |
|---|---|---|
| Ḥafṣ Uthmānic text | [Tanzil.net](https://tanzil.net/) | Tanzil license — attribution required, no modification of text. |
| Warsh / Qālūn JSON | [KFGQPC](https://qurancomplex.gov.sa/) via [thetruetruth/quran-data-kfgqpc](https://github.com/thetruetruth/quran-data-kfgqpc) | KFGQPC published files. Redistribution status unconfirmed → derived outputs are git-ignored. |
| Variant attributions | Ibn al-Jazarī _an-Nashr_; ad-Dānī _at-Taysīr_; ash-Shāṭibī _Ḥirz al-Amānī_ | Public domain. Citations included in tooltips. |
| Variant overlay | [Corpus Coranicum](https://corpuscoranicum.de/) (BBAW) — `quran_variants` TEI from [telota/corpus-coranicum-tei](https://github.com/telota/corpus-coranicum-tei) | **CC BY-SA 4.0**. Reader + transliteration overlay for the 8 curated verses → `src/data/ccVariants.json` (231 entries, 870 readers indexed). CC's TEI ships transliteration only, so the overlay is scholarly cross-reference, not byte-matchable Arabic. |
| Manuscript catalogue | [Corpus Coranicum](https://corpuscoranicum.de/) (BBAW) — `quran_manuscripts` TEI from [telota/corpus-coranicum-tei](https://github.com/telota/corpus-coranicum-tei) | **CC BY-SA 4.0**. msDesc records for 2,323 Qur'an manuscripts (TELOTA TEI export, 2007–2024). We extract structured metadata (shelfmark, repository, dating, dimensions, script class, image URIs) for the 1,544 with parseable dates ≤ 1100 CE → `src/data/ccManuscripts.json`. The `ManuscriptTimeline` view shows 174 featured codices linking to digital surrogates; for famous codices CC's TEI doesn't carry image URLs for (Sanaa palimpsest fragments, BnF Arabe 328, Birmingham Mingana 1572a, Tübingen Ma VI 165) we attach Wikimedia / institutional-viewer fallback URLs and tag them `featuredFallback: true`. |
| Audio recitations (verse-level) | [EveryAyah.com](https://everyayah.com/) ([recitations index](https://everyayah.com/recitations_ayat.html)) | Per-reciter terms; attribution required. We construct verse-level URL paths only — no audio is bundled or cached. Slugs verified against the live CDN; see `src/data/audioReciters.json` `_meta.verifiedAt`. Hosts Ḥafṣ (Husary, Alafasy, Maher al-Muaiqly, Abdul Basit Murattal) + Warsh (Abdul Basit, Ibrahim Al-Dosary, Yassin Al-Jazaery). |
| Audio recitations (surah-level Qālūn) | [MP3Quran.net](https://www.mp3quran.net/eng) ([API v3](https://mp3quran.net/api/v3/reciters?language=en)) | Per-reciter terms; attribution required. EveryAyah hosts no Qālūn reciter, so Qālūn audio comes from MP3Quran's surah-level CDN (one MP3 per chapter; the play button surfaces a surah-level caveat in its tooltip). Reciters: Mahmoud Khalil al-Husary (Qālūn), Marwan Alakri, Muhammad Abu Sneina. Server URLs verified live. |
| Morphology | [Quranic Arabic Corpus](http://corpus.quran.com/) (Kais Dukes, Leeds) | License (verbatim from `corpus.quran.com/download/`): _"Permission is granted to copy and distribute verbatim copies of this file, but CHANGING IT IS NOT ALLOWED."_ Stricter than vanilla GPL — **no derivatives**. Used illustratively by `MorphologyBrowser`. |
| Future-work hub | [QUL — Quranic Universal Library](https://qul.tarteel.ai/resources) (Tarteel) | MIT (CMS code). Catalogue of Hafs-centric resources (132 reciters with timing, 209 translations, 115 tafsirs, multiple Hafs orthographies). Downloads sit behind JS-rendered buttons; not yet integrated. Documented for later ingestion. |
| KFGQPC Hafs Uthmanic font | [KFGQPC](https://fonts.qurancomplex.gov.sa/) | Not bundled. See [Font installation](#font-installation) below. |

The application code is **MIT** ([LICENSE](LICENSE)). All Qur'anic text comes from upstream sources and retains its source license. **No Arabic text in this repository was generated by AI** — see policy below.

---

## Sacred text integrity

This project's first obligation is to its readers: when the app shows you "Warsh reads X here", that string must be a faithful copy of what Warsh actually transmits — not a guess, not a model output, not a synthesis. The full policy is at [docs/decisions/0001-sacred-text-integrity-policy.md](docs/decisions/0001-sacred-text-integrity-policy.md). In summary:

1. **No AI generation of Qur'anic Arabic, anywhere, ever.** Every Arabic string traces to a cited primary source. The data file carries `_meta.generated = false` and `_meta.generationPolicy = "no-arabic-text-generation"` as a tripwire; if either flips, the loader throws.
2. **All readings carry a `source: SourceCitation.id`.** Unknown source ids fail the integrity test. `manual_placeholder` is reserved for entries not yet cross-checked.
3. **Display text is deep-frozen** at module load. Mutation throws in strict mode.
4. **Normalization never modifies the original.** `stripDiacritics` and `normalizeRasm` return fresh strings used only for comparison.
5. **LLMs may help with code and English-language docs only** — not with Arabic verse text.
6. **Uncertain variants are flagged** as `curated_sample`, `verified`, or `needs_review`.

These are enforced by `tests/integrity.test.js`, `tests/audit.test.js`, and `npm run audit:data`.

---

## Status

Current release is [**v0.1.1**](docs/releases/v0.1.1.md) (2026-05-04). **Private academic prototype — not for general distribution yet.** The integrity machinery is in place; the dataset and reviewer process are still nascent.

| | |
|---|---|
| Verses in dataset | 8 |
| Readings | 53 |
| `confidence: verified` | 0 |
| `manual_placeholder` source ids | 12 |
| Source authority status | All three corpora `unknown` |
| Tests | 128 / 128 passing |

The next phase is acquiring official corpora with documented retrieval URLs and hashes (see [docs/planning/phase-6-official-source-acquisition.md](docs/planning/phase-6-official-source-acquisition.md)) and beginning scholar verification of each reading. The much longer-term plan is in [docs/research-vision.md](docs/research-vision.md).

---

## How it works (briefly)

```
[ User ] ──▶ React UI (Vite)
              │
              ├── Variant explorer  ─▶ src/data/quranData.json   (curated, MIT)
              ├── Morphology        ─▶ src/data/morphologyData.json   (QAC, GPL-3.0)
              └── Manuscript timeline ─▶ src/data/manuscriptsData.json
                       │
              shaping.js: harfbuzzjs (WASM) ─[fail]→ browser-native fallback
                       │
              Optional overlays (git-ignored, built locally):
                 src/data/hafsCorpusData.json   (KFGQPC)
                 src/data/fullVariants.json     (Tanzil + KFGQPC)
```

Data is deep-frozen at module load. `diffByCuratedVariants` is a pure function — running it leaves the input JSON byte-identical (asserted in tests). The dataset (`quranData.json`) and the reviewer ledger (`verificationLedger.json`) are separate concerns; see [docs/decisions/0002-canonical-dataset-and-ledger.md](docs/decisions/0002-canonical-dataset-and-ledger.md). Mermaid version: [docs/architecture.mmd](docs/architecture.mmd).

### Module layout

```
src/
├── App.jsx, main.jsx           # entry + view switcher
├── components/                  # ControlPanel, VerseDisplay, WordToken,
│                                # VariantTooltip, Legend, ShapingBadge,
│                                # AuditBadge, MorphologyBrowser,
│                                # ManuscriptTimeline
├── lib/                         # arabic, alignment, shaping, dataLoader,
│                                # diff, sourceParsers
├── data/                        # quranMeta, quranData, sampleVariants,
│                                # verificationLedger, sourceManifest,
│                                # morphologyData,
│                                # ccVariants (CC variant overlay),
│                                # ccManuscripts (CC manuscript catalogue),
│                                # hafsCorpusData (git-ignored),
│                                # fullVariants (git-ignored)
└── styles/app.css

scripts/                         # fetch-data, build-variants,
                                 # build-hafs-corpus, fetch-morphology,
                                 # extract-cc-variants, extract-cc-manuscripts,
                                 # audit-data, init-verification-ledger,
                                 # match-sources, apply-source-matches,
                                 # record-source-provenance
tests/                           # 10 vitest suites, 128 tests
docs/                            # architecture, timeline, ADRs, planning, releases
```

---

## Workflows for contributors

- **Adding a verified variant** → [CONTRIBUTING.md](CONTRIBUTING.md) walks through editing `quranData.json`, the verification ledger, and the audit tools.
- **Matching dataset readings against local KFGQPC / Tanzil corpora** → [docs/source-matching.md](docs/source-matching.md). Diagnostic-only on `unknown` corpora; can replace `manual_placeholder` source ids on `official_confirmed` corpora.
- **Source authority levels** (`unknown` → `official_confirmed` → `scholar_confirmed`) → [docs/decisions/0003-source-authority-levels.md](docs/decisions/0003-source-authority-levels.md).
- **HarfBuzz fallback rationale** → [docs/decisions/0004-harfbuzz-optional-fallback.md](docs/decisions/0004-harfbuzz-optional-fallback.md).

---

## Font installation

The KFGQPC Hafs Uthmanic font has its own license and isn't bundled. To use it:

1. Download `KFGQPC HAFS Uthmanic Script Regular.ttf` from [the KFGQPC fonts page](https://fonts.qurancomplex.gov.sa/) (terms posted there).
2. Place at `public/fonts/KFGQPC-HafsUthmanic.ttf`.
3. Restart the dev server. The header badge should switch from "Native shaping (fallback)" to "HarfBuzz WASM" if `harfbuzzjs` is installed.

If you skip this, the app still runs — the browser falls back to whatever Arabic font is installed on the system.

---

## Roadmap

The short-term roadmap (verifying the curated 8 verses, acquiring official corpora) is in [docs/planning/phase-6-official-source-acquisition.md](docs/planning/phase-6-official-source-acquisition.md). The full long-term vision (knowledge graph, Markdown vault, HarfBuzz snapshot QA, scholar review pipeline through 2027) is in [docs/research-vision.md](docs/research-vision.md).

A six-month plan for moving from `curated_sample` to scholarly-`verified` data, including phonetic-only variants (imāla, ishmām, idghām) and verse-numbering reconciliation across the Madanī / Kūfī / Baṣrī ʿadd traditions, is summarized in the same docs.

---

## Contributing

Currently a private academic research project; contributions are limited to the core research team until publication. **No verse text may be authored — only copied from a cited source.** Variant additions require a citation that traces to a published primary source (an-Nashr, at-Taysīr, Ḥirz al-Amānī, or a peer-reviewed academic edition). See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code: MIT — see [LICENSE](LICENSE). Qur'anic text and variant data: see [Data sources](#data-sources) above; each upstream source's license applies to its content.

## Acknowledgements

This project stands on the work of the **Tanzil project**, the **King Fahd Glorious Qur'an Printing Complex**, the **Corpus Coranicum** project (BBAW), the **Quranic Arabic Corpus** (Kais Dukes), and the centuries of qirāʾāt scholarship that produced _an-Nashr_ (Ibn al-Jazarī), _at-Taysīr_ (ad-Dānī), and _Ḥirz al-Amānī_ (ash-Shāṭibī). Errors in this project are mine, not theirs.

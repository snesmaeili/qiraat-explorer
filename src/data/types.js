// Explicit data model for the qira'at explorer.
//
// All types are pure data (no behaviour). The intent is that anything
// representing Qur'anic text is an immutable record — read but never written
// by the runtime. The diff engine and components consume these structures
// without modifying them.
//
// We use JSDoc rather than TypeScript so the codebase stays one-file-per-
// module plain JS, but the contract is just as binding for editors and
// reviewers. See SACRED TEXT INTEGRITY POLICY in README.md.

/**
 * @typedef {'hafs' | 'warsh' | 'qalun' | 'al-duri' | 'shuba' | 'ibn-kathir'
 *   | 'abu-amr' | 'ibn-amir' | 'hamza' | 'kisai' | 'qunbul' | 'khalaf' | 'yaqub'} RiwayahId
 *
 * Canonical riwayah identifiers. The seven (and ten) qira'at, each with one
 * or more transmitters. Add to RiwayahId — never spell a new id inline.
 */

/**
 * @typedef {Object} Riwayah
 * @property {RiwayahId} id
 * @property {string}    label        Display label, e.g. "Ḥafṣ ʿan ʿĀṣim"
 * @property {string}    qari         Reader, e.g. "ʿĀṣim al-Kūfī"
 * @property {string}    rawi         Transmitter, e.g. "Ḥafṣ ibn Sulaymān"
 * @property {string}    region       Geographic centre, e.g. "Kūfa"
 * @property {string=}   scriptStyle  Mushaf style, e.g. "Uthmānic" / "Maghribī rasm"
 */

/**
 * @typedef {'curated_sample' | 'verified' | 'needs_review'} Confidence
 *
 * Trust label attached to every reading and variant group.
 *   curated_sample : included as a representative example only
 *   verified       : cross-checked against a primary source by a reviewer
 *   needs_review   : machine-aligned or imported but not yet hand-verified
 *
 * The runtime renders this prominently in the variant panel so the user
 * always knows what they're looking at.
 */

/**
 * @typedef {'vocalization' | 'consonantal' | 'word-form' | 'orthographic'
 *   | 'verse-numbering' | 'unknown'} DiffCategory
 *
 * Categories of qira'at difference:
 *   vocalization     : same skeleton, different vowels / shadda / sukun
 *                      (e.g. 5:6 wa-arjulakum / wa-arjulikum)
 *   consonantal      : different consonantal skeleton (rasm)
 *                      (e.g. 1:6 al-ṣirāṭ / al-sirāṭ when read with sīn)
 *   word-form        : same root, different morphological form
 *                      (e.g. 2:9 yakhdaʿūn (form I) / yukhādiʿūn (form III))
 *   orthographic     : spelling-convention difference that does not change
 *                      what is read (e.g. superscript-alif vs full alif)
 *   verse-numbering  : the variant is in where verse boundaries sit, not
 *                      in word forms (Madanī vs Kūfī ʿadd)
 *   unknown          : the diff was detected but not yet categorised
 */

/**
 * @typedef {Object} SourceCitation
 * @property {string}  id          Stable id, e.g. "an-nashr", "tanzil",
 *                                 "kfqpc-warsh", "manual_placeholder"
 * @property {string}  label       Human-readable, e.g. "Ibn al-Jazarī, an-Nashr"
 * @property {string=} reference   Page/section, e.g. "vol. 1, p. 271"
 * @property {string=} url         If freely available online
 * @property {string=} notes       Editorial notes about the source
 *
 * `manual_placeholder` is reserved for entries that have not yet been
 * cross-checked. Anything still bearing manual_placeholder MUST also be
 * marked confidence: needs_review.
 */

/**
 * @typedef {Object} WordToken
 * @property {number} index    Position in the verse (0-based, in the
 *                             token order of THIS riwayah's text)
 * @property {string} text     Verbatim text from the source — IMMUTABLE.
 *                             Never modified by the diff engine, the
 *                             normaliser, or the renderer.
 *
 * Two contracts:
 *   1. WordToken instances are frozen by the data loader.
 *   2. The diff engine and React components only ever READ WordToken.text;
 *      any normalisation (e.g. for comparison) returns a fresh string
 *      without touching the original.
 */

/**
 * @typedef {Object} VerseText
 * @property {RiwayahId}      riwayah
 * @property {number}         surah
 * @property {number}         ayah
 * @property {WordToken[]}    tokens     Per-word breakdown (immutable)
 * @property {string}         source     SourceCitation.id of the text source
 * @property {Confidence}     confidence
 *
 * One VerseText per (verse, riwayah). The Hafs reading and the Warsh
 * reading of Q 1:4 are two distinct VerseText records with their own
 * tokens; they are NEVER concatenated or merged.
 */

/**
 * @typedef {Object} VariantReading
 * @property {RiwayahId} riwayah
 * @property {string}    text       Verbatim form in this reading
 * @property {string=}   translit
 * @property {string=}   gloss      Brief English gloss
 * @property {string}    source     SourceCitation.id
 *
 * A VariantReading represents how ONE riwayah pronounces / writes the
 * word at the variant point. The base reading is always present in the
 * `readings` list of its VariantGroup so consumers can show it alongside
 * alternates.
 */

/**
 * @typedef {Object} VariantGroup
 * @property {number}            surah
 * @property {number}            ayah
 * @property {number}            wordIndex      Index into baseRiwayah's
 *                                              verse tokens
 * @property {RiwayahId}         baseRiwayah    Riwayah this group is anchored to
 * @property {DiffCategory}      category
 * @property {VariantReading[]}  readings       Includes the base reading
 * @property {string=}           explanation    Short prose explanation
 * @property {string[]}          citations      SourceCitation.ids
 * @property {Confidence}        confidence
 */

/**
 * @typedef {Object} Ayah
 * @property {number}                          surah
 * @property {number}                          ayah
 * @property {Partial<Record<RiwayahId, VerseText>>} texts
 * @property {VariantGroup[]}                  variants
 *
 * Holds all known per-riwayah texts for one verse plus the annotated
 * variant groups. `texts` is partial because not every riwayah in the
 * registry will have its text populated for every verse.
 */

/**
 * @typedef {Object} Surah
 * @property {number}  number
 * @property {string}  name        Romanised
 * @property {string}  arabic      Arabic name
 * @property {number}  ayahCount   Per the Hafs/KFGQPC numbering
 * @property {'Meccan' | 'Medinan'} revelation
 */

/**
 * @typedef {Object} QuranDataBundle
 * @property {Object}                   _meta
 * @property {string}                   _meta.schemaVersion
 * @property {string}                   _meta.purpose
 * @property {boolean}                  _meta.generated      Always false; sentinel
 * @property {string}                   _meta.generationPolicy
 * @property {Surah[]}                  surahs
 * @property {Riwayah[]}                riwayat
 * @property {Record<string, SourceCitation>} sources
 * @property {Record<string, Ayah>}     verses             Keyed "surah:ayah"
 */

// ---- VERIFICATION LAYER (Phase 3) ----
//
// The verification layer is an AUDIT trail that lives ALONGSIDE quranData.json
// (not inside it). It tracks which readings have been independently checked
// against a primary source, and by whom. Verification metadata MUST NEVER
// replace the actual SourceCitation reference on a VariantReading — the
// dataset remains the single source of truth for sacred text. The ledger
// only tracks WHO LOOKED AT IT and WHAT THEY CONCLUDED.
//
// `confidence` (on VariantGroup, in quranData.json) is the trust label the
// runtime renders to the user. `VerificationStatus` (in verificationLedger
// .json) is the workflow state used by reviewers. They are RELATED but
// independent: a reviewer changes the ledger first, and only then is it
// safe to flip confidence.

/**
 * @typedef {'unreviewed' | 'source_located' | 'text_matched'
 *   | 'scholar_verified' | 'rejected' | 'needs_correction'} VerificationStatus
 *
 *   unreviewed         No human has looked at this reading yet.
 *   source_located     A reviewer has located the cited source but has not
 *                      yet compared the exact Arabic text.
 *   text_matched       The Arabic text in the dataset matches the source
 *                      character-for-character.
 *   scholar_verified   A qualified scholar has both located the source AND
 *                      attests to the variant's accuracy and attribution.
 *   rejected           The recorded reading is incorrect; remove from
 *                      the dataset or correct it.
 *   needs_correction   The reading exists but has issues (wrong attribution,
 *                      typo in transliteration, etc.); see notes.
 */

/**
 * One row in verificationLedger.json. The ledger is keyed by `id`.
 *
 * @typedef {Object} VerificationRecord
 * @property {string}  id                Stable id, e.g.
 *                                       "q1-4-w0-hafs"
 *                                       (surah-ayah-wordIndex-riwayah)
 * @property {number}  surah
 * @property {number}  ayah
 * @property {number}  wordIndex
 * @property {string}  variantKey        VariantGroup-level key from
 *                                       makeVariantKey() — pins this record
 *                                       to a particular VariantGroup
 * @property {string}  riwayah           RiwayahId (string)
 * @property {string}  readingText       VERBATIM copy of the dataset reading.
 *                                       Used to detect drift: if the dataset
 *                                       text changes, the textHash changes
 *                                       and the record is flagged stale.
 * @property {string}  source            Mirrors the reading's source id at
 *                                       record-creation time
 * @property {string=} sourceReference   Optional reviewer-supplied citation
 *                                       (e.g. "an-Nashr 1/271, line 14")
 * @property {VerificationStatus} status
 * @property {string=} reviewer          Initials/email/handle of the reviewer
 * @property {string=} reviewedAt        ISO date string of last review
 * @property {string=} notes             Free-text reviewer commentary
 * @property {string=} evidenceLink      URL or file path to scan/photo of
 *                                       the cited primary source
 * @property {string}  textHash          createTextHash(readingText)
 */

/**
 * @typedef {Object} DatasetAuditSummary
 * @property {number}  totalVerses
 * @property {number}  totalVariantGroups
 * @property {number}  totalReadings
 * @property {Record<Confidence, number>}        byConfidence
 * @property {Record<VerificationStatus, number>} byVerificationStatus
 * @property {number}  manualPlaceholderCount    Readings whose source id is "manual_placeholder"
 * @property {number}  missingSourceCount        Readings missing a source id entirely
 * @property {number}  invalidCitationCount      VariantGroup citations that don't resolve
 * @property {boolean} generatedDataset          Mirrors dataset _meta.generated
 * @property {string}  generationPolicy          Mirrors dataset _meta.generationPolicy
 */

// This module exports nothing at runtime; it exists only to host the
// JSDoc typedefs above so other files can reference them.
export {};

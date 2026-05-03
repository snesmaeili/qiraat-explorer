# 1. Sacred Text Integrity Policy

**Status:** Accepted

## Context
The project displays textual variants of the Qur'an across different recitation traditions. Because this is sacred text, the accuracy of the Arabic string presented to the user is of utmost importance. Errors, hallucinations, or synthetically generated "guesses" at variant texts are unacceptable. 

## Decision
We establish a non-negotiable Sacred Text Integrity Policy:
1. No AI generation of Qur'anic Arabic. Every Arabic string comes verbatim from a cited primary source dataset.
2. All readings trace to a `SourceCitation.id`.
3. Display text is immutable. The data loader deep-freezes text at runtime.
4. Normalisation functions (`stripDiacritics`, `normalizeRasm`) never mutate original strings; they return fresh strings used only for comparison.
5. Uncertain variants must be clearly flagged (`confidence: needs_review` or `curated_sample`). `manual_placeholder` must be used when the source is not yet cross-checked.

## Consequences
- The system is reliable and safe for academic and scholarly use.
- The build and data-import pipelines must never try to "fix" or guess missing text using generative AI.
- Any manual variant addition requires an explicit citation.

## Tests/guards enforcing the decision
- `tests/integrity.test.js` enforces that no string is mutated.
- The `quranData.json` `_meta` object enforces `generated: false` and `generationPolicy: "no-arabic-text-generation"`.
- `tests/audit.test.js` strictly checks that `confidence: verified` variants cannot coexist with `manual_placeholder` sources.

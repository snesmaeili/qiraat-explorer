# 3. Source Authority Levels

**Status:** Accepted

## Context
When replacing a `manual_placeholder` with a definitive source ID (such as `kfqpc-warsh`), we must ensure the target corpus genuinely represents the official text, not an unconfirmed local test fixture.

## Decision
We establish explicit source authority levels:
- `unknown`: local file exists, but retrieval path is not documented.
- `local_fixture`: test/sample corpus; useful for parser/matcher tests only.
- `downloaded_unverified`: file downloaded from documented location but not yet checked.
- `official_confirmed`: file provenance, hash, license, and retrieval method are documented.
- `scholar_confirmed`: human reviewer checked the reading against authoritative qira'at sources.

Source replacement scripts can only swap `manual_placeholder` for definitive source IDs if the corpus authority is `official_confirmed` or higher. Exact matching on lower-tier sources is diagnostic only.

## Consequences
- Protects the integrity of the database from accidental promotion of unauthorized test data.
- Enforces an auditable trail for how raw corpora are gathered and vetted.
- "Exact match" does not imply "authoritative match."

## Tests/guards enforcing the decision
- `scripts/match-sources.js` checks `authorityStatus` before granting `eligible_source_id_replacement`.
- `tests/provenance.test.js` strictly asserts that `unknown` or `local_fixture` corpora yield `not_eligible` for source replacement.

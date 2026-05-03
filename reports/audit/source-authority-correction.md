# Source Authority Correction

During Phase 4b, we noted that the local corpora used for source matching had unconfirmed provenance (unknown retrieval method and URL). We also noted that the Warsh and Qalun test corpora had identical SHA-256 hashes, indicating they are subset test fixtures, not the full official distributions.

To maintain our Sacred Text Integrity Policy, replacing `manual_placeholder` with a definitive source ID (like `kfqpc-warsh`) implies a level of authority that these unconfirmed local files do not possess.

As a result, in Phase 4c, we reverted the 12 source IDs modified by the matcher back to `manual_placeholder`. We used the backup file `reports/audit/backups/quranData.before-source-apply.json` to identify and safely revert only the affected source IDs, leaving the Arabic text, confidence levels, and all other metadata exactly as they were.

Source replacement will now be governed by a strict `replacementEligibility` policy that requires documented, official provenance before assigning source IDs from machine matching.

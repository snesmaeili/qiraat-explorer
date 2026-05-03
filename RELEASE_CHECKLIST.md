# Release Checklist

Before releasing or tagging a new version, perform the following validation steps locally:

- [ ] `npm install` runs successfully and cleanly.
- [ ] `npm run record:provenance` executes without failure.
- [ ] `npm run match:sources` executes and shows 0 replacements for unconfirmed files.
- [ ] `npm run audit:data` runs and exits with code 0 (no hard errors).
- [ ] `npm test` passes all tests (currently ~122).
- [ ] `npm run build` completes the Vite production build without resolving errors.
- [ ] `git status --short` shows a clean working tree.
- [ ] Confirm `scripts/_raw` is ignored in `.gitignore`.
- [ ] Confirm no backup JSON (`src/data/quranData.before-source-apply.json` or `reports/audit/backups/*.json`) is tracked.
- [ ] Confirm no `VariantGroup` claims `confidence: verified` unless explicitly scholar-reviewed.
- [ ] Confirm the `manual_placeholder` count in the audit report matches expectations (12 for v0.1).
- [ ] Confirm source authority warnings are understood and documented.

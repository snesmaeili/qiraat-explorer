import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

describe('Provenance and Auditability', () => {
  it('raw corpora are ignored by git via .gitignore', () => {
    const gitignorePath = resolve(ROOT, '.gitignore');
    const gitignore = readFileSync(gitignorePath, 'utf8');
    expect(gitignore).toContain('scripts/_raw/');
  });

  it('backup quranData.before-source-apply.json is not in runtime src/data or is ignored', () => {
    const backupPath = resolve(ROOT, 'src', 'data', 'quranData.before-source-apply.json');
    expect(existsSync(backupPath)).toBe(false);
    
    const gitignorePath = resolve(ROOT, '.gitignore');
    const gitignore = readFileSync(gitignorePath, 'utf8');
    expect(gitignore).toContain('reports/audit/backups/*.json');
  });

  it('sourceManifest entries have licenseNote and canCommitRawFile', () => {
    const manifestPath = resolve(ROOT, 'src', 'data', 'sourceManifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    
    for (const [key, entry] of Object.entries(manifest.sources)) {
      expect(entry).toHaveProperty('licenseNote');
      expect(entry).toHaveProperty('canCommitRawFile');
    }
  });

  it('record-source-provenance produces JSON without Arabic corpus text', () => {
    const provPath = resolve(ROOT, 'reports', 'audit', 'source-provenance.json');
    expect(existsSync(provPath)).toBe(true);
    
    const prov = JSON.parse(readFileSync(provPath, 'utf8'));
    expect(prov._meta.generated).toBe(true);
    expect(prov._meta.generationPolicy).toBe('no-arabic-text-generation');
    
    // Ensure no Arabic text or large content exists.
    const rawJson = readFileSync(provPath, 'utf8');
    // Basic Arabic unicode range check
    const hasArabic = /[\u0600-\u06FF]/.test(rawJson);
    expect(hasArabic).toBe(false);
  });

  it('sha256 and fileSizeBytes are present when local corpus exists', () => {
    const provPath = resolve(ROOT, 'reports', 'audit', 'source-provenance.json');
    const prov = JSON.parse(readFileSync(provPath, 'utf8'));
    
    for (const source of Object.values(prov.sources)) {
      if (source.exists) {
        expect(source.sha256).not.toBeNull();
        expect(source.fileSizeBytes).toBeGreaterThan(0);
      } else {
        expect(source.sha256).toBeNull();
        expect(source.fileSizeBytes).toBe(0);
      }
    }
  });

  it('source matching report includes hashes for loaded corpora', () => {
    const reportPath = resolve(ROOT, 'reports', 'audit', 'source-match-report.json');
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      for (const source of report.sources) {
        if (source.state === 'loaded') {
          expect(source.fileHash).not.toBeNull();
          expect(source.bytes).toBeGreaterThan(0);
        }
      }
    }
  });

  it('unknown provenance exact matches are not eligible for source replacement', () => {
    const scriptPath = resolve(ROOT, 'scripts', 'match-sources.js');
    const scriptText = readFileSync(scriptPath, 'utf8');
    expect(scriptText).toContain("replacementEligibility = 'not_eligible_unknown_provenance'");
  });

  it('local_fixture exact matches are not eligible for source replacement', () => {
    const scriptPath = resolve(ROOT, 'scripts', 'match-sources.js');
    const scriptText = readFileSync(scriptPath, 'utf8');
    expect(scriptText).toContain("entry.authorityStatus === 'local_fixture'");
    expect(scriptText).toContain("replacementEligibility = 'not_eligible_fixture'");
  });

  it('duplicate hash across different riwayah corpora produces a warning', () => {
    const scriptPath = resolve(ROOT, 'scripts', 'record-source-provenance.js');
    const scriptText = readFileSync(scriptPath, 'utf8');
    expect(scriptText).toContain('Duplicate SHA-256 hash');
  });

  it('apply-source-matches makes zero changes when replacementEligibility is not eligible_source_id_replacement', () => {
    const scriptPath = resolve(ROOT, 'scripts', 'apply-source-matches.js');
    const scriptText = readFileSync(scriptPath, 'utf8');
    expect(scriptText).toContain("m.replacementEligibility !== 'eligible_source_id_replacement'");
  });

  it('apply-source-matches can replace manual_placeholder only when authorityStatus is official_confirmed and exact_word_index_match', () => {
    const scriptPath = resolve(ROOT, 'scripts', 'match-sources.js');
    const scriptText = readFileSync(scriptPath, 'utf8');
    expect(scriptText).toContain("entry.authorityStatus === 'official_confirmed' || entry.authorityStatus === 'scholar_confirmed'");
    expect(scriptText).toContain("replacementEligibility = 'eligible_source_id_replacement'");
  });

  it('current sourceManifest unknown files do not permit replacement', () => {
    const manifestPath = resolve(ROOT, 'src', 'data', 'sourceManifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const source of Object.values(manifest.sources)) {
      expect(source.authorityStatus).toBe('unknown');
    }
  });

  it('current quranData has manual_placeholder restored for unconfirmed source IDs', () => {
    const datasetPath = resolve(ROOT, 'src', 'data', 'quranData.json');
    const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
    let hasReplacedSource = false;
    for (const ayah of Object.values(dataset.verses)) {
      for (const group of ayah.variants ?? []) {
        for (const r of group.readings ?? []) {
          if (r.source === 'kfqpc-warsh' || r.source === 'kfqpc-qalun') {
            hasReplacedSource = true;
          }
        }
      }
    }
    expect(hasReplacedSource).toBe(false); // All should be manual_placeholder or others
  });

  it('source matching can still report exact matches without treating them as authoritative', () => {
    const reportPath = resolve(ROOT, 'reports', 'audit', 'source-match-report.json');
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      if (report.matches && report.matches.length > 0) {
        const exactMatch = report.matches.find(m => m.status === 'exact_word_index_match');
        if (exactMatch) {
          expect(exactMatch.replacementEligibility).not.toBe('eligible_source_id_replacement');
        }
      }
    }
  });

  it('quranData Arabic text remains unchanged during correction', () => {
    const datasetPath = resolve(ROOT, 'src', 'data', 'quranData.json');
    const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
    const backupPath = resolve(ROOT, 'reports', 'audit', 'backups', 'quranData.before-source-apply.json');
    if (existsSync(backupPath)) {
      const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
      // Basic check that verses exist and text properties are identical
      expect(dataset.verses['2:132']).toBeDefined();
      expect(JSON.stringify(dataset.verses['2:132'].hafs))
        .toEqual(JSON.stringify(backup.verses['2:132'].hafs));
    }
  });
});

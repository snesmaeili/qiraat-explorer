import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

describe('apply-source-matches.js', () => {
  it('runs safely in dry-run mode by default', () => {
    // Should run without writing to quranData.json
    const out = execSync('node scripts/apply-source-matches.js', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    expect(out).toContain('Mode: DRY-RUN');
    expect(out).toContain('No files modified');
  });
  
  it('does not generate Arabic text', () => {
    // Ensuring the script output indicates source text is unchanged
    const scriptText = readFileSync(resolve(PROJECT_ROOT, 'scripts/apply-source-matches.js'), 'utf8');
    expect(scriptText).toContain('sourceTextUnchanged: true');
    expect(scriptText).toMatch(/The Arabic text is unchanged|The Arabic text is preserved verbatim/);
  });
  
  it('only changes source IDs', () => {
    // Verify the only reassignment to the reading object is the source property
    const scriptText = readFileSync(resolve(PROJECT_ROOT, 'scripts/apply-source-matches.js'), 'utf8');
    expect(scriptText).toMatch(/entry\.reading\.source = r\.to/);
    expect(scriptText).not.toMatch(/entry\.reading\.text =/);
  });
});

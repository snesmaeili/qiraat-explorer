#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(ROOT, 'src', 'data', 'sourceManifest.json');
const OUT_FILE = resolve(ROOT, 'reports', 'audit', 'source-provenance.json');

async function hashFile(filePath) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolveHash(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

  const provenance = {
    _meta: {
      schemaVersion: "1.0.0",
      purpose: "Provenance record for local external source corpora used during source matching.",
      generated: true,
      generationPolicy: "no-arabic-text-generation",
      createdAt: new Date().toISOString(),
      createdBy: "scripts/record-source-provenance.js"
    },
    sources: {}
  };

  const hashesByRiwayah = new Map();

  for (const [key, entry] of Object.entries(manifest.sources)) {
    const target = resolve(ROOT, entry.localPath);
    const present = existsSync(target);
    
    let sha256 = null;
    let fileSizeBytes = 0;
    
    if (present) {
      sha256 = await hashFile(target);
      const st = await stat(target);
      fileSizeBytes = st.size;
      
      if (!hashesByRiwayah.has(sha256)) {
        hashesByRiwayah.set(sha256, new Set());
      }
      hashesByRiwayah.get(sha256).add(entry.riwayah);
    }

    provenance.sources[key] = {
      sourceId: entry.sourceId,
      riwayah: entry.riwayah,
      localPath: entry.localPath,
      exists: present,
      fileSizeBytes,
      sha256,
      authorityStatus: entry.authorityStatus || "unknown",
      isCompleteCorpus: entry.isCompleteCorpus || false,
      corpusScope: entry.corpusScope || "unknown",
      provenanceWarning: entry.provenanceWarning || "",
      duplicateHashGroup: null,
      retrievalMethod: entry.retrievalMethod || "unknown",
      retrievalUrl: entry.retrievalUrl || null,
      retrievedAt: entry.lastMatchedAt || null,
      licenseNote: entry.licenseNote || "",
      canCommitRawFile: entry.canCommitRawFile || false,
      notes: entry.notes || ""
    };
  }

  for (const [key, source] of Object.entries(provenance.sources)) {
    if (source.sha256 && hashesByRiwayah.has(source.sha256)) {
      const riwayahs = Array.from(hashesByRiwayah.get(source.sha256));
      if (riwayahs.length > 1) {
        source.duplicateHashGroup = source.sha256;
        console.warn(`WARNING: Duplicate SHA-256 hash ${source.sha256} detected across different riwayahs: ${riwayahs.join(', ')}`);
      }
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(provenance, null, 2) + '\n');
  console.log(`Wrote source provenance to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

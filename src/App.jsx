import React, { useEffect, useState, useMemo } from 'react';
import { ControlPanel } from './components/ControlPanel.jsx';
import { VerseDisplay } from './components/VerseDisplay.jsx';
import { Legend } from './components/Legend.jsx';
import { ShapingBadge } from './components/ShapingBadge.jsx';
import { AuditBadge } from './components/AuditBadge.jsx';
import { MorphologyBrowser } from './components/MorphologyBrowser.jsx';
import { ManuscriptTimeline } from './components/ManuscriptTimeline.jsx';
import datasetBundle from './data/quranData.json';
import {
  listSurahs,
  listRiwayat,
  listVersesWithVariants,
  getAyah,
  getRiwayah,
  dataMeta,
} from './lib/dataLoader.js';
import { diffByCuratedVariants } from './lib/diff.js';
import { initShaping, shapingMode } from './lib/shaping.js';

const VIEW_MODES = [
  { id: 'variants', label: 'Variants' },
  { id: 'morphology', label: 'Morphology' },
  { id: 'manuscripts', label: 'Manuscripts' },
];

export default function App() {
  const surahs = useMemo(listSurahs, []);
  const riwayat = useMemo(listRiwayat, []);
  const interesting = useMemo(listVersesWithVariants, []);
  const meta = useMemo(dataMeta, []);

  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(4);
  const [baseRiwayah, setBaseRiwayah] = useState('hafs');
  const [compRiwayah, setCompRiwayah] = useState('warsh');
  const [viewMode, setViewMode] = useState('variants');
  const [shapingReady, setShapingReady] = useState(false);

  useEffect(() => {
    initShaping().then(() => setShapingReady(true));
  }, []);

  const ayahData = useMemo(() => getAyah(surah, ayah), [surah, ayah]);
  const wordDiffs = useMemo(
    () => diffByCuratedVariants(ayahData, baseRiwayah, compRiwayah),
    [ayahData, baseRiwayah, compRiwayah],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">
          <h1>Qira'at Explorer</h1>
          <p className="app__subtitle">
            Visualizing textual variants across the canonical readings of the Quran
          </p>
        </div>
        <nav className="app__view-switcher" aria-label="Explorer views">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={
                'app__mode-toggle ' +
                (viewMode === mode.id ? 'is-active' : '')
              }
              aria-pressed={viewMode === mode.id}
              onClick={() => setViewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </nav>
        <div className="app__badges">
          <AuditBadge dataset={datasetBundle} />
          <ShapingBadge mode={shapingReady ? shapingMode() : 'pending'} />
        </div>
      </header>

      <main className="app__main">
        <aside className="app__sidebar">
          <ControlPanel
            surahs={surahs}
            riwayat={riwayat}
            surah={surah}
            ayah={ayah}
            baseRiwayah={baseRiwayah}
            compRiwayah={compRiwayah}
            interesting={interesting}
            onSelectVerse={(s, a) => { setSurah(s); setAyah(a); }}
            onSetBase={setBaseRiwayah}
            onSetComp={setCompRiwayah}
          />
          <Legend />
        </aside>

        <section className="app__content">
          {viewMode === 'variants' && (
            <VerseDisplay
              ayahData={ayahData}
              surah={surah}
              ayah={ayah}
              surahMeta={surahs.find((s) => s.number === surah)}
              wordDiffs={wordDiffs}
              baseRiwayah={getRiwayah(baseRiwayah)}
              compRiwayah={getRiwayah(compRiwayah)}
            />
          )}
          {viewMode === 'morphology' && (
            <MorphologyBrowser
              surah={surah}
              ayah={ayah}
              ayahData={ayahData}
            />
          )}
          {viewMode === 'manuscripts' && (
            <ManuscriptTimeline />
          )}
        </section>
      </main>

      <footer className="app__footer">
        <p>
          Schema v{meta.schemaVersion}. Hafs text from Tanzil.
          Variants from Ibn al-Jazari an-Nashr and ad-Dani at-Taysir.
          No Arabic text in this app is AI-generated. See README, Sacred Text Integrity Policy.
        </p>
      </footer>
    </div>
  );
}

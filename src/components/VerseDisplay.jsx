import React, { useMemo, useState, useRef, useEffect } from 'react';
import { WordToken } from './WordToken.jsx';
import { VariantPanel } from './VariantPanel.jsx';

export function VerseDisplay({
  ayahData,
  surah,
  ayah,
  surahMeta,
  wordDiffs,
  baseRiwayah,
  compRiwayah,
}) {
  const [openIdx, setOpenIdx] = useState(null);
  const containerRef = useRef(null);

  // diff lookup by word index for fast access during render
  const diffByIdx = useMemo(() => {
    const m = new Map();
    for (const d of wordDiffs) m.set(d.wordIndex, d);
    return m;
  }, [wordDiffs]);

  useEffect(() => { setOpenIdx(null); }, [surah, ayah, baseRiwayah?.id, compRiwayah?.id]);

  useEffect(() => {
    function onDoc(e) {
      if (!containerRef.current?.contains(e.target)) setOpenIdx(null);
    }
    function onKey(e) { if (e.key === 'Escape') setOpenIdx(null); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!ayahData) {
    return (
      <div className="verse verse--empty">
        <p>
          No data for {surah}:{ayah} in the curated sample. The dataset
          should include complete Hafs browsing data when
          <code>src/data/hafsCorpusData.json</code> has been built.
        </p>
      </div>
    );
  }

  const baseTokens = ayahData.baseText?.tokens ?? [];
  const variantCount = (ayahData.variants ?? []).length;
  const highlightCount = wordDiffs.length;
  const openDiff = openIdx != null ? diffByIdx.get(openIdx) : null;

  return (
    <div className="verse" ref={containerRef}>
      <header className="verse__header">
        <div className="verse__id">
          <span className="verse__surah">{surahMeta?.name ?? 'Surah ' + surah}</span>
          <span className="verse__separator">·</span>
          <span className="verse__ayah">Ayah {ayah}</span>
        </div>
        <div className="verse__counts">
          <span title="Documented variant points across all riwayat">
            {variantCount} documented
          </span>
          <span title={'Differences between ' + (baseRiwayah?.label ?? 'base') + ' and ' + (compRiwayah?.label ?? 'comparison')}>
            {highlightCount} highlighted
          </span>
        </div>
      </header>

      <p className="verse__compare">
        Comparing <strong>{baseRiwayah?.label ?? '-'}</strong> against{' '}
        <strong>{compRiwayah?.label ?? '-'}</strong>
      </p>
      {variantCount === 0 && (
        <p className="verse__compare">
          Complete Hafs text is available for this ayah; no curated variant
          points are recorded here yet.
        </p>
      )}

      <div
        className="verse__text"
        lang="ar"
        dir="rtl"
        role="group"
        aria-label={'Verse ' + surah + ':' + ayah + ', base reading ' + (baseRiwayah?.label ?? '')}
      >
        {baseTokens.map((tok) => {
          const diff = diffByIdx.get(tok.index);
          return (
            <WordToken
              key={tok.index}
              token={tok}
              diff={diff}
              isOpen={openIdx === tok.index}
              onClick={() => setOpenIdx(openIdx === tok.index ? null : tok.index)}
            />
          );
        })}
      </div>

      {openDiff && (
        <VariantPanel
          diff={openDiff}
          baseRiwayah={baseRiwayah}
          compRiwayah={compRiwayah}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </div>
  );
}

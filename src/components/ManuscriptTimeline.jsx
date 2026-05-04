import React, { useMemo, useState } from 'react';
import ccManuscripts from '../data/ccManuscripts.json';

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

/** Map Corpus Coranicum's msDesc parse onto the visualization's expected
 *  shape. Preserves the existing timeline CSS. */
function adapt(m) {
  const parsed = m.origDate?.parsed;
  let start = m.origDate?.centerYear ?? null;
  let end = m.origDate?.centerYear ?? null;
  if (parsed?.kind === 'before') {
    start = parsed.year - 100;
    end = parsed.year;
  } else if (parsed?.kind === 'after') {
    start = parsed.year;
    end = parsed.year + 100;
  } else if (parsed?.kind === 'range') {
    start = parsed.year;
    end = parsed.year2;
  }
  const w = m.physical?.widthMm;
  const h = m.physical?.heightMm;
  const dimensions = w && h ? `${w} × ${h} ${m.physical?.dimUnit ?? 'mm'}` : null;
  return {
    ccId: m.ccId,
    id: m.shelfmark || m.title || m.ccId,
    title: m.title,
    repository: m.repository,
    script: m.script,
    provenance: m.provenance,
    prose: m.summary,
    extracted: {
      c14: { start, end, center: m.origDate?.centerYear ?? null },
      dimensions,
      imageUrl: m.imageUrls?.[0] ?? null,
    },
  };
}

export function ManuscriptTimeline() {
  const manuscripts = useMemo(
    () =>
      (ccManuscripts.manuscripts ?? [])
        .filter((m) => m.featured && m.origDate?.centerYear != null)
        .map(adapt)
        .sort((a, b) => (a.extracted.c14.center ?? 0) - (b.extracted.c14.center ?? 0)),
    [],
  );

  const [activeId, setActiveId] = useState(manuscripts[0]?.id ?? null);

  const bounds = useMemo(() => {
    if (manuscripts.length === 0) return { min: 550, max: 1100 };
    const starts = manuscripts.map((ms) => ms.extracted.c14.start ?? ms.extracted.c14.center);
    const ends = manuscripts.map((ms) => ms.extracted.c14.end ?? ms.extracted.c14.center);
    return {
      min: Math.min(...starts) - 20,
      max: Math.max(...ends) + 20,
    };
  }, [manuscripts]);

  const totalYears = bounds.max - bounds.min || 1;
  const activeManuscript =
    manuscripts.find((ms) => ms.id === activeId) ?? manuscripts[0] ?? null;

  if (manuscripts.length === 0) {
    return (
      <div className="ms-timeline-container">
        <h2 className="ms-timeline-title">Early Qur'anic Manuscripts</h2>
        <p className="ms-timeline-subtitle">No dated manuscript records are available.</p>
      </div>
    );
  }

  return (
    <div className="ms-timeline-container">
      <div className="ms-timeline-header">
        <div>
          <h2 className="ms-timeline-title">Early Qur'anic Manuscripts</h2>
          <p className="ms-timeline-subtitle">
            From the Corpus Coranicum project (BBAW), CC&nbsp;BY-SA&nbsp;4.0. Showing {manuscripts.length} dated codices with linked digital surrogates; full catalogue of {ccManuscripts._meta?.totalManuscriptsInUpstream ?? '2,323'} entries upstream.
          </p>
        </div>
        <span className="ms-timeline-count">{manuscripts.length} records</span>
      </div>

      <div className="timeline-wrapper">
        <div className="timeline-axis" aria-hidden="true">
          <span className="timeline-tick" style={{ left: '0%' }}>{bounds.min} CE</span>
          <span className="timeline-tick" style={{ left: '50%' }}>
            {Math.round(bounds.min + totalYears / 2)} CE
          </span>
          <span className="timeline-tick" style={{ left: '100%' }}>{bounds.max} CE</span>
        </div>

        <div className="timeline-plots" role="list" aria-label="Manuscript date ranges">
          {manuscripts.map((ms) => {
            const startPct = clampPercent(((ms.extracted.c14.start - bounds.min) / totalYears) * 100);
            const endPct = clampPercent(((ms.extracted.c14.end - bounds.min) / totalYears) * 100);
            const widthPct = Math.max(1, endPct - startPct);
            const centerPct = clampPercent(startPct + widthPct / 2);
            const isActive = ms.id === activeManuscript?.id;

            return (
              <div key={ms.ccId ?? ms.id} role="listitem">
                <button
                  type="button"
                  className={'ms-plot-point ' + (isActive ? 'is-active' : '')}
                  style={{
                    '--range-start': `${startPct}%`,
                    '--range-width': `${widthPct}%`,
                    '--range-center': `${centerPct}%`,
                  }}
                  onClick={() => setActiveId(ms.id)}
                  onFocus={() => setActiveId(ms.id)}
                  onMouseEnter={() => setActiveId(ms.id)}
                >
                  <span className="ms-plot-label">{ms.id}</span>
                  <span className="ms-plot-track" aria-hidden="true">
                    <span className="ms-plot-range" />
                    <span className="ms-plot-marker" />
                  </span>
                  <span className="ms-plot-years">
                    {ms.extracted.c14.start}-{ms.extracted.c14.end} CE
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {activeManuscript && (
        <article className="ms-tooltip">
          <h3>{activeManuscript.id}</h3>
          {activeManuscript.title && (
            <p className="ms-tooltip-repo"><strong>Title:</strong> {activeManuscript.title}</p>
          )}
          {activeManuscript.repository && (
            <p className="ms-tooltip-repo"><strong>Repository:</strong> {activeManuscript.repository}</p>
          )}
          <div className="ms-tooltip-content">
            <div className="ms-tooltip-details">
              <p>
                <strong>Date range:</strong>{' '}
                {activeManuscript.extracted.c14.start}-{activeManuscript.extracted.c14.end} CE
                {activeManuscript.extracted.c14.center != null && (
                  <> (center {activeManuscript.extracted.c14.center})</>
                )}
              </p>
              {activeManuscript.script && (
                <p><strong>Script:</strong> {activeManuscript.script}</p>
              )}
              {activeManuscript.extracted.dimensions && (
                <p><strong>Dimensions:</strong> {activeManuscript.extracted.dimensions}</p>
              )}
              {activeManuscript.provenance && (
                <p><strong>Provenance:</strong> {activeManuscript.provenance}</p>
              )}
              {activeManuscript.prose && (
                <p className="ms-tooltip-prose">{activeManuscript.prose}</p>
              )}
              {activeManuscript.extracted.imageUrl && (
                <p>
                  <a href={activeManuscript.extracted.imageUrl} target="_blank" rel="noopener noreferrer">
                    View digital surrogate ↗
                  </a>
                </p>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

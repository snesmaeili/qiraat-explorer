import React, { useMemo, useState } from 'react';
import manuscriptsData from '../data/manuscriptsData.json';

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function ManuscriptTimeline() {
  const manuscripts = useMemo(
    () =>
      manuscriptsData
        .filter((ms) => ms.extracted?.c14)
        .sort((a, b) => a.extracted.c14.center - b.extracted.c14.center),
    [],
  );

  const [activeId, setActiveId] = useState(manuscripts[0]?.id ?? null);

  const bounds = useMemo(() => {
    if (manuscripts.length === 0) return { min: 550, max: 800 };
    const starts = manuscripts.map((ms) => ms.extracted.c14.start);
    const ends = manuscripts.map((ms) => ms.extracted.c14.end);
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
          <p className="ms-timeline-subtitle">C-14 ranges extracted from catalogue prose.</p>
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

        <div className="timeline-plots" role="list" aria-label="C-14 manuscript ranges">
          {manuscripts.map((ms) => {
            const startPct = clampPercent(((ms.extracted.c14.start - bounds.min) / totalYears) * 100);
            const endPct = clampPercent(((ms.extracted.c14.end - bounds.min) / totalYears) * 100);
            const widthPct = Math.max(1, endPct - startPct);
            const centerPct = clampPercent(startPct + widthPct / 2);
            const isActive = ms.id === activeManuscript?.id;

            return (
              <div key={ms.id} role="listitem">
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
          <div className="ms-tooltip-content">
            {activeManuscript.extracted.imageUrl && (
              <img
                src={activeManuscript.extracted.imageUrl}
                alt={activeManuscript.id}
                className="ms-tooltip-image"
              />
            )}
            <div className="ms-tooltip-details">
              <p>
                <strong>C-14 range:</strong>{' '}
                {activeManuscript.extracted.c14.start}-{activeManuscript.extracted.c14.end} CE
              </p>
              <p>
                <strong>Dimensions:</strong>{' '}
                {activeManuscript.extracted.dimensions || 'Unknown'}
              </p>
              <p className="ms-tooltip-prose">{activeManuscript.prose}</p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

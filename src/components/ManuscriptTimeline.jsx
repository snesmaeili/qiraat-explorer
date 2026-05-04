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
  const allManuscripts = useMemo(
    () =>
      (ccManuscripts.manuscripts ?? [])
        .filter((m) => m.featured && m.origDate?.centerYear != null)
        .map(adapt)
        .sort((a, b) => (a.extracted.c14.center ?? 0) - (b.extracted.c14.center ?? 0)),
    [],
  );

  // Bounds are computed from the unfiltered set so the slider extents are
  // stable as the user filters.
  const fullBounds = useMemo(() => {
    if (allManuscripts.length === 0) return { min: 550, max: 1100 };
    const starts = allManuscripts.map((ms) => ms.extracted.c14.start ?? ms.extracted.c14.center);
    const ends = allManuscripts.map((ms) => ms.extracted.c14.end ?? ms.extracted.c14.center);
    return {
      min: Math.min(...starts) - 20,
      max: Math.max(...ends) + 20,
    };
  }, [allManuscripts]);

  // Top-N repositories by featured count, used as the filter pill set.
  const topRepositories = useMemo(() => {
    const counts = new Map();
    for (const ms of allManuscripts) {
      const repo = (ms.repository ?? 'Unknown').replace(/\s+/g, ' ').trim();
      counts.set(repo, (counts.get(repo) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([repo, n]) => ({ repo, count: n }));
  }, [allManuscripts]);

  const [yearLo, setYearLo] = useState(fullBounds.min);
  const [yearHi, setYearHi] = useState(fullBounds.max);
  const [activeRepos, setActiveRepos] = useState(() => new Set()); // empty = all

  const manuscripts = useMemo(() => {
    return allManuscripts.filter((ms) => {
      const c = ms.extracted.c14.center;
      if (c == null || c < yearLo || c > yearHi) return false;
      if (activeRepos.size > 0) {
        const repo = (ms.repository ?? 'Unknown').replace(/\s+/g, ' ').trim();
        if (!activeRepos.has(repo)) return false;
      }
      return true;
    });
  }, [allManuscripts, yearLo, yearHi, activeRepos]);

  const [activeId, setActiveId] = useState(allManuscripts[0]?.id ?? null);

  const bounds = useMemo(() => {
    if (manuscripts.length === 0) return { min: yearLo, max: yearHi };
    const starts = manuscripts.map((ms) => ms.extracted.c14.start ?? ms.extracted.c14.center);
    const ends = manuscripts.map((ms) => ms.extracted.c14.end ?? ms.extracted.c14.center);
    return {
      min: Math.min(yearLo, Math.min(...starts) - 20),
      max: Math.max(yearHi, Math.max(...ends) + 20),
    };
  }, [manuscripts, yearLo, yearHi]);

  const totalYears = bounds.max - bounds.min || 1;
  const activeManuscript =
    manuscripts.find((ms) => ms.id === activeId) ??
    allManuscripts.find((ms) => ms.id === activeId) ??
    manuscripts[0] ?? null;

  function toggleRepo(repo) {
    setActiveRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repo)) next.delete(repo);
      else next.add(repo);
      return next;
    });
  }

  if (allManuscripts.length === 0) {
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
            From the Corpus Coranicum project (BBAW), CC&nbsp;BY-SA&nbsp;4.0. Showing {manuscripts.length} of {allManuscripts.length} featured codices; full catalogue of {ccManuscripts._meta?.totalManuscriptsInUpstream ?? '2,323'} entries upstream.
          </p>
        </div>
        <span className="ms-timeline-count">{manuscripts.length} records</span>
      </div>

      <div className="ms-timeline-filters">
        <div className="ms-filter-slider" role="group" aria-label="Filter by year">
          <label>
            <span>From {yearLo} CE</span>
            <input
              type="range"
              min={fullBounds.min}
              max={fullBounds.max}
              value={yearLo}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setYearLo(Math.min(v, yearHi));
              }}
              aria-label="Earliest year"
            />
          </label>
          <label>
            <span>to {yearHi} CE</span>
            <input
              type="range"
              min={fullBounds.min}
              max={fullBounds.max}
              value={yearHi}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setYearHi(Math.max(v, yearLo));
              }}
              aria-label="Latest year"
            />
          </label>
        </div>
        <div className="ms-filter-pills" role="group" aria-label="Filter by repository">
          <button
            type="button"
            className={'ms-filter-pill ' + (activeRepos.size === 0 ? 'is-active' : '')}
            onClick={() => setActiveRepos(new Set())}
          >
            All repositories
          </button>
          {topRepositories.map(({ repo, count }) => {
            const short = repo.split(',')[0].trim();
            return (
              <button
                key={repo}
                type="button"
                className={'ms-filter-pill ' + (activeRepos.has(repo) ? 'is-active' : '')}
                onClick={() => toggleRepo(repo)}
                title={repo}
              >
                {short} ({count})
              </button>
            );
          })}
        </div>
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

import React from 'react';
import { getSource } from '../lib/dataLoader.js';

const CATEGORY_LABEL = {
  vocalization: 'Vocalization',
  consonantal: 'Consonantal (rasm)',
  'word-form': 'Word-form',
  orthographic: 'Orthographic',
  'verse-numbering': 'Verse numbering',
  unknown: 'Unknown',
};

const CONFIDENCE_LABEL = {
  curated_sample: { text: 'Curated sample', cls: 'badge--warn' },
  verified: { text: 'Verified', cls: 'badge--ok' },
  needs_review: { text: 'Needs review', cls: 'badge--pending' },
  inferred: { text: 'Engine-inferred', cls: 'badge--pending' },
};

export function VariantPanel({ diff, baseRiwayah, compRiwayah, onClose }) {
  const group = diff.variantGroup;
  const conf = CONFIDENCE_LABEL[diff.confidence] ?? CONFIDENCE_LABEL.needs_review;

  return (
    <div className="tooltip" role="dialog" aria-label="Variant details">
      <header className="tooltip__header">
        <div>
          <span className="tooltip__type">{CATEGORY_LABEL[diff.category] ?? diff.category}</span>
          <span className={'badge ' + conf.cls} style={{ marginLeft: '0.5rem' }}>
            {conf.text}
          </span>
        </div>
        <button type="button" className="tooltip__close" onClick={onClose} aria-label="Close">×</button>
      </header>

      <ul className="tooltip__readings">
        <ReadingRow
          riwayah={baseRiwayah}
          text={diff.baseText}
          reading={findReading(group, baseRiwayah?.id)}
          isBase
        />
        <ReadingRow
          riwayah={compRiwayah}
          text={diff.compText}
          reading={findReading(group, compRiwayah?.id)}
        />
      </ul>

      {/* All other readings recorded for this variant point — useful context */}
      {group?.readings && group.readings.length > 2 && (
        <details className="tooltip__more">
          <summary>Other readings ({group.readings.length - 2})</summary>
          <ul className="tooltip__readings">
            {group.readings
              .filter((r) => r.riwayah !== baseRiwayah?.id && r.riwayah !== compRiwayah?.id)
              .map((r) => (
                <ReadingRow
                  key={r.riwayah}
                  riwayah={{ id: r.riwayah, label: humanRiwayah(r.riwayah) }}
                  text={r.text}
                  reading={r}
                />
              ))}
          </ul>
        </details>
      )}

      {group?.explanation && (
        <p className="tooltip__notes">{group.explanation}</p>
      )}

      {group?.citations && group.citations.length > 0 && (
        <footer className="tooltip__citations">
          <strong>Sources:</strong>
          <ul>
            {group.citations.map((id) => {
              const src = getSource(id);
              return (
                <li key={id}>
                  {src ? (
                    src.url ? (
                      <a href={src.url} target="_blank" rel="noreferrer">{src.label}</a>
                    ) : (
                      <span>{src.label}</span>
                    )
                  ) : (
                    <span>{id}</span>
                  )}
                  {src?.reference && <em> — {src.reference}</em>}
                </li>
              );
            })}
          </ul>
        </footer>
      )}
    </div>
  );
}

function ReadingRow({ riwayah, text, reading, isBase }) {
  const sourceId = reading?.source ?? null;
  const src = sourceId ? getSource(sourceId) : null;
  return (
    <li className="tooltip__reading">
      <span className="tooltip__form" lang="ar" dir="rtl">{text}</span>
      <div className="tooltip__readers">
        <span className={'tooltip__reader is-active'}>
          <strong>
            {isBase ? 'Base · ' : 'Compare · '}{riwayah?.label ?? '—'}
          </strong>
          {reading?.translit && <em>{reading.translit}</em>}
          {reading?.gloss && <span className="tooltip__gloss">— {reading.gloss}</span>}
          {sourceId && (
            <span
              className={'badge ' + (sourceId === 'manual_placeholder' ? 'badge--warn' : 'badge--ok')}
              title={src?.label ?? sourceId}
              style={{ marginLeft: '0.4rem' }}
            >
              {sourceId === 'manual_placeholder' ? 'Placeholder' : (src?.label?.split(' ')[0] ?? sourceId)}
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

function findReading(group, riwayahId) {
  if (!group || !riwayahId) return null;
  return group.readings.find((r) => r.riwayah === riwayahId) ?? null;
}

function humanRiwayah(id) {
  return id; // no fancy lookup needed; the more-readings list shows id-only
}

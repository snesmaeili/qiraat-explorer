import React, { useEffect, useRef, useState } from 'react';
import { getSource } from '../lib/dataLoader.js';
import { ccReadingsFor, ccTotalAttestations, CC_SOURCE } from '../lib/ccVariants.js';
import { firstAvailableReciter, audioUrlInfo, audioSourceFor } from '../lib/audio.js';

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
          surah={group?.surah}
          ayah={group?.ayah}
          isBase
        />
        <ReadingRow
          riwayah={compRiwayah}
          text={diff.compText}
          reading={findReading(group, compRiwayah?.id)}
          surah={group?.surah}
          ayah={group?.ayah}
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
                  surah={group?.surah}
                  ayah={group?.ayah}
                />
              ))}
          </ul>
        </details>
      )}

      {group && (
        <CCAttestations
          surah={group.surah}
          ayah={group.ayah}
          wordIndex={group.wordIndex}
        />
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

function ReadingRow({ riwayah, text, reading, surah, ayah, isBase }) {
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
          <AudioButton riwayahId={riwayah?.id} surah={surah} ayah={ayah} />
        </span>
      </div>
    </li>
  );
}

/**
 * Lazy-loading audio button. On first click, creates a single HTMLAudioElement
 * pointing at the EveryAyah CDN URL for this riwāya's preferred reciter and
 * starts playback. Subsequent clicks toggle play/pause. If no reciter exists
 * for the riwāya (e.g. Qālūn — EveryAyah doesn't host one), renders disabled.
 */
function AudioButton({ riwayahId, surah, ayah }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const reciter = riwayahId ? firstAvailableReciter(riwayahId) : null;
  const info = reciter && surah != null ? audioUrlInfo(reciter, surah, ayah) : null;
  const url = info?.url ?? null;
  const granularity = info?.granularity ?? null;
  const sourceMeta = audioSourceFor(reciter);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!url) {
    return (
      <button
        type="button"
        className="tooltip__audio-btn is-disabled"
        disabled
        title={`Audio not available for riwāya '${riwayahId ?? '?'}' on the configured CDNs`}
        aria-label="Audio not available"
      >
        ♪
      </button>
    );
  }

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
      audioRef.current.addEventListener('error', () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      const p = audioRef.current.play();
      if (p && typeof p.then === 'function') {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        setPlaying(true);
      }
    }
  }

  const bitrateNote = reciter.bitrate ? ` (${reciter.bitrate})` : '';
  const granularityNote =
    granularity === 'surah'
      ? ` — surah-level audio: plays from the start of surah ${surah}, not just verse ${ayah}`
      : '';
  const title =
    `Play ${reciter.name}${bitrateNote} — via ${sourceMeta.label}${granularityNote}`;

  return (
    <button
      type="button"
      className={
        'tooltip__audio-btn ' +
        (playing ? 'is-playing ' : '') +
        (granularity === 'surah' ? 'is-surah-level' : '')
      }
      onClick={toggle}
      title={title}
      aria-label={`Play audio of ${reciter.name}`}
      data-src={url}
      data-granularity={granularity}
    >
      {playing ? '◼' : '▶'}
    </button>
  );
}

function findReading(group, riwayahId) {
  if (!group || !riwayahId) return null;
  return group.readings.find((r) => r.riwayah === riwayahId) ?? null;
}

function humanRiwayah(id) {
  return id; // no fancy lookup needed; the more-readings list shows id-only
}

function CCAttestations({ surah, ayah, wordIndex }) {
  if (surah == null || ayah == null || wordIndex == null) return null;
  const forms = ccReadingsFor(surah, ayah, wordIndex);
  if (forms.length === 0) return null;
  const total = ccTotalAttestations(surah, ayah, wordIndex);

  return (
    <details className="tooltip__cc">
      <summary>
        <strong>Corpus Coranicum attestations</strong> — {forms.length} {forms.length === 1 ? 'form' : 'forms'},{' '}
        {total} {total === 1 ? 'reader' : 'readers'}
      </summary>
      <p className="tooltip__cc-note">
        Latin transliteration as attested in the Corpus Coranicum TEI export. Includes shādhdh
        readings (companions, grammarians) alongside canonical qārīs. Cross-reference only —
        no Arabic surface text is generated by this app.
      </p>
      <ul className="tooltip__cc-list">
        {forms.map((f) => (
          <li key={f.form} className="tooltip__cc-form">
            <span className="tooltip__cc-translit">{f.form}</span>
            <span className="tooltip__cc-count">
              ({f.attestations.length} {f.attestations.length === 1 ? 'reader' : 'readers'})
            </span>
            <span className="tooltip__cc-readers">
              {f.attestations.map((a) => a.name).join(', ')}
            </span>
          </li>
        ))}
      </ul>
      <p className="tooltip__cc-attribution">
        Source:{' '}
        <a href={CC_SOURCE.url} target="_blank" rel="noreferrer">{CC_SOURCE.label}</a>
        {' · '}
        <a href={CC_SOURCE.licenseUrl} target="_blank" rel="noreferrer">{CC_SOURCE.license}</a>
      </p>
    </details>
  );
}

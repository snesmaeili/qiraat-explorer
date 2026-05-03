import React from 'react';

export function ControlPanel({
  surahs,
  riwayat,
  surah,
  ayah,
  baseRiwayah,
  compRiwayah,
  interesting,
  onSelectVerse,
  onSetBase,
  onSetComp,
}) {
  const surahMeta = surahs.find((s) => s.number === surah);
  const maxAyah = surahMeta ? surahMeta.ayahCount : 286;
  const cls = (v) =>
    'panel__interesting-btn ' +
    (v.surah === surah && v.ayah === ayah ? 'is-active' : '');

  return (
    <div className="panel">
      <section className="panel__section">
        <h2 className="panel__heading">Verse</h2>
        <div className="panel__row">
          <label htmlFor="surah-select" className="panel__label">Surah</label>
          <select
            id="surah-select"
            value={surah}
            onChange={(e) => onSelectVerse(Number(e.target.value), 1)}
            className="panel__select"
          >
            {surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="panel__row">
          <label htmlFor="ayah-input" className="panel__label">Ayah</label>
          <input
            id="ayah-input"
            type="number"
            min={1}
            max={maxAyah}
            value={ayah}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= maxAyah) onSelectVerse(surah, v);
            }}
            className="panel__input"
          />
          <span className="panel__hint">/ {maxAyah}</span>
        </div>
      </section>

      <section className="panel__section">
        <h2 className="panel__heading">Compare readings</h2>
        <p className="panel__sub">
          Choose two riwayat. Words that differ between them are highlighted in
          the verse below.
        </p>
        <div className="panel__row">
          <label htmlFor="base-riwayah" className="panel__label">Base</label>
          <select
            id="base-riwayah"
            className="panel__select"
            value={baseRiwayah}
            onChange={(e) => onSetBase(e.target.value)}
          >
            {riwayat.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="panel__row">
          <label htmlFor="comp-riwayah" className="panel__label">Compare</label>
          <select
            id="comp-riwayah"
            className="panel__select"
            value={compRiwayah}
            onChange={(e) => onSetComp(e.target.value)}
          >
            {riwayat.map((r) => (
              <option key={r.id} value={r.id} disabled={r.id === baseRiwayah}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel__section">
        <h2 className="panel__heading">Verses with documented variants</h2>
        <p className="panel__sub">Hand-curated, sourced examples from the qiraat literature.</p>
        <ul className="panel__interesting">
          {interesting.map((v) => (
            <li key={v.surah + ':' + v.ayah}>
              <button
                type="button"
                className={cls(v)}
                onClick={() => onSelectVerse(v.surah, v.ayah)}
              >
                <span className="panel__interesting-key">{v.surah}:{v.ayah}</span>
                <span className="panel__interesting-title">
                  {v.variants[0].category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

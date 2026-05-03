import React from 'react';

const ITEMS = [
  {
    cls: 'word--vocalization',
    label: 'Vocalization',
    desc: 'Same skeleton, different vowels - e.g. Q 5:6 wa-arjulakum vs wa-arjulikum.',
  },
  {
    cls: 'word--consonantal',
    label: 'Consonantal (rasm)',
    desc: 'Different consonantal skeleton - e.g. Q 1:6 sirat vs sirat-with-sin.',
  },
  {
    cls: 'word--wordform',
    label: 'Word-form',
    desc: 'Same root, different morphological form - e.g. Q 2:9 yakhdaun vs yukhadiun.',
  },
  {
    cls: 'word--orthographic',
    label: 'Orthographic',
    desc: 'Spelling-convention difference that does not change what is read.',
  },
  {
    cls: 'word--verseNumbering',
    label: 'Verse numbering',
    desc: 'Difference in where verse boundaries sit, not in word forms.',
  },
];

export function Legend() {
  return (
    <section className="legend" aria-label="Legend">
      <h2 className="panel__heading">Legend</h2>
      <ul className="legend__items">
        {ITEMS.map((it) => (
          <li key={it.cls} className="legend__item">
            <span className={'word ' + it.cls + ' legend__swatch'} lang="ar" dir="rtl">
              مِثَال
            </span>
            <div>
              <strong>{it.label}</strong>
              <p>{it.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

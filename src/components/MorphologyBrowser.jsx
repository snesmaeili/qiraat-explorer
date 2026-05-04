import React, { useMemo } from 'react';
import morphologyData from '../data/morphologyData.json';

export function MorphologyBrowser({ surah, ayah, ayahData }) {
  const verseKey = `${surah}:${ayah}`;
  const verseMorph = morphologyData[verseKey] || [];

  const morphMap = useMemo(() => {
    const map = new Map();
    for (const item of verseMorph) map.set(item.wordIndex, item);
    return map;
  }, [verseMorph]);

  if (!ayahData) {
    return <div className="morphology-browser__empty">Verse not found.</div>;
  }

  const cards = ayahData.baseText.tokens
    .map((token, idx) => ({ token, idx, morphology: morphMap.get(idx) }))
    .filter((item) => item.morphology);

  return (
    <div className="morphology-browser">
      <div className="morphology-browser__header">
        <div>
          <h2 className="morphology-browser__title">Morphological Analysis</h2>
          <p className="morphology-browser__subtitle">
            QAC and Talmon comparison sample for Q {verseKey}
          </p>
        </div>
        <span className="morphology-browser__count">{cards.length} words</span>
      </div>

      {cards.length === 0 ? (
        <p className="morphology-browser__info">
          No morphology comparison is available for Q {verseKey}.
        </p>
      ) : (
        <div className="morphology-browser__grid">
          {cards.map(({ token, idx, morphology }) => {
            const rootMatch = morphology.qac.root === morphology.talmon.root;
            const lemmaMatch = morphology.qac.lemma === morphology.talmon.lemma;
            const isFullAgreement = rootMatch && lemmaMatch;

            return (
              <article
                key={idx}
                className={
                  'morph-card ' +
                  (isFullAgreement ? 'morph-card--agree' : 'morph-card--disagree')
                }
              >
                <div className="morph-card__arabic">{token.text}</div>
                <div className="morph-card__comparison">
                  <div className="morph-card__source">
                    <h3>QAC</h3>
                    <p><span className="morph-card__label">Root:</span> {morphology.qac.root}</p>
                    <p><span className="morph-card__label">Lemma:</span> {morphology.qac.lemma}</p>
                    <p><span className="morph-card__label">POS:</span> {morphology.qac.pos}</p>
                  </div>
                  <div className="morph-card__source">
                    <h3>Talmon</h3>
                    <p className={!rootMatch ? 'diff-highlight' : ''}>
                      <span className="morph-card__label">Root:</span> {morphology.talmon.root}
                    </p>
                    <p className={!lemmaMatch ? 'diff-highlight' : ''}>
                      <span className="morph-card__label">Lemma:</span> {morphology.talmon.lemma}
                    </p>
                    <p><span className="morph-card__label">POS:</span> {morphology.talmon.pos}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

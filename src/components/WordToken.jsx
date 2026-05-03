import React from 'react';

const CATEGORY_CLASS = {
  vocalization: 'word--vocalization',
  consonantal: 'word--consonantal',
  'word-form': 'word--wordform',
  orthographic: 'word--orthographic',
  'verse-numbering': 'word--verseNumbering',
  unknown: 'word--unknown',
};

export function WordToken({ token, diff, isOpen, onClick }) {
  const cls = ['word'];
  if (diff) cls.push(CATEGORY_CLASS[diff.category] || 'word--unknown');
  if (isOpen) cls.push('word--open');

  const onKeyDown = (e) => {
    if (!diff) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  // The renderer always emits the verbatim source string. It must NEVER
  // produce computed Arabic text (see Sacred Text Integrity Policy).
  return (
    <span
      className={cls.join(' ')}
      onClick={diff ? onClick : undefined}
      onKeyDown={onKeyDown}
      tabIndex={diff ? 0 : -1}
      role={diff ? 'button' : undefined}
      aria-haspopup={diff ? 'dialog' : undefined}
      aria-expanded={diff ? isOpen : undefined}
      aria-label={
        diff
          ? token.text + ' - ' + diff.category + ' variant; click for details'
          : token.text
      }
      data-word-index={token.index}
    >
      {token.text}
    </span>
  );
}

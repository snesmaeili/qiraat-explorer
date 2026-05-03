import React from 'react';

const COPY = {
  pending: { label: 'Loading shaper…', className: 'badge badge--pending' },
  harfbuzz: { label: 'HarfBuzz WASM', className: 'badge badge--ok' },
  native: { label: 'Native shaping (fallback)', className: 'badge badge--warn' },
};

export function ShapingBadge({ mode }) {
  const c = COPY[mode] ?? COPY.pending;
  return (
    <span
      className={c.className}
      title={
        mode === 'harfbuzz'
          ? 'Text is being shaped by harfbuzzjs (HarfBuzz compiled to WebAssembly).'
          : mode === 'native'
            ? 'HarfBuzz unavailable — falling back to the browser\'s built-in OpenType shaper. App still works.'
            : 'Shaper initializing.'
      }
    >
      {c.label}
    </span>
  );
}

# 4. HarfBuzz Optional Fallback

**Status:** Accepted

## Context
Proper rendering of complex Arabic typography (like Uthmanic script) typically requires advanced shaping engines like HarfBuzz to parse and apply OpenType features correctly. However, a hard dependency on a WASM compilation of HarfBuzz introduces brittleness if the file fails to load or the font is missing.

## Decision
We adopt a "fail gracefully" dual-mode shaping architecture:
- If `harfbuzzjs` and the necessary fonts are available in the public directory, the app uses HarfBuzz WASM to shape and measure the text.
- If they fail to load, the app automatically falls back to browser-native OpenType rendering.
- A UI badge explicitly states which shaping mode is active.

## Consequences
- The application will always load and be usable, even without the external font or WASM blob.
- Development setup is simplified; no strict prerequisite steps to simply view the application.

## Tests/guards enforcing the decision
- `tests/integrity.test.js` ("App boots without harfbuzzjs") verifies the app defaults to native mode gracefully without throwing errors if the font or module is missing.

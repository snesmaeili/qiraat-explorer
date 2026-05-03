// Arabic text shaping wrapper.
//
// Strategy: default to "browser-native" shaping (the browser's built-in
// OpenType engine via CSS), and only attempt to load harfbuzzjs (HarfBuzz
// compiled to WebAssembly) when (a) the user has placed the Quranic font in
// public/fonts/ AND (b) the package is actually installed. The harfbuzzjs
// module is heavy (~1.5 MB WASM) and exports a top-level Promise that boots
// WASM on import, so we don't want that running on every page load.
//
// Public API: initShaping() resolves to { mode, shape }
//   mode: 'native' | 'harfbuzz'
//   shape(text) -> Array<{ glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset, char }>

const FONT_URL = '/fonts/KFGQPC-HafsUthmanic.ttf';

let _hb = null;
let _font = null;
let _mode = 'pending';

const NATIVE = { mode: 'native', shape: shapeNative };

export async function initShaping(opts = {}) {
  if (_mode !== 'pending') {
    return _mode === 'harfbuzz'
      ? { mode: 'harfbuzz', shape: shapeHB }
      : NATIVE;
  }
  if (typeof window === 'undefined') {
    _mode = 'native';
    return NATIVE;
  }

  // Probe the font URL with HEAD before attempting to load harfbuzzjs.
  // If the font isn't installed, we don't bother loading the WASM at all.
  const fontUrl = opts.fontUrl ?? FONT_URL;
  let fontReachable = false;
  try {
    const r = await fetch(fontUrl, { method: 'HEAD' });
    fontReachable = r.ok;
  } catch {
    fontReachable = false;
  }
  if (!fontReachable) {
    console.info(
      '[shaping] Font ' + fontUrl + ' not present. Using browser-native shaping. ' +
        'See README "Font installation" to enable HarfBuzz.',
    );
    _mode = 'native';
    return NATIVE;
  }

  // Font is there - try to load harfbuzzjs. Use a string variable + vite-ignore
  // so Vite doesn't statically resolve & pre-bundle the module.
  try {
    const modName = 'harfbuzzjs';
    const hbjsModule = await import(/* @vite-ignore */ modName);
    const hb = await (hbjsModule.default ?? hbjsModule);
    if (!hb || typeof hb.createBlob !== 'function') {
      throw new Error('unexpected harfbuzzjs shape');
    }
    const fontBuf = new Uint8Array(await (await fetch(fontUrl)).arrayBuffer());
    const blob = hb.createBlob(fontBuf);
    const face = hb.createFace(blob, 0);
    const font = hb.createFont(face);
    font.setScale(1000, 1000);
    _hb = hb;
    _font = font;
    _mode = 'harfbuzz';
    console.info('[shaping] HarfBuzz WASM ready, font:', fontUrl);
    return { mode: 'harfbuzz', shape: shapeHB };
  } catch (err) {
    console.warn(
      '[shaping] HarfBuzz unavailable - falling back to native shaping:',
      err && err.message ? err.message : err,
    );
    _mode = 'native';
    return NATIVE;
  }
}

function shapeHB(text) {
  if (!_hb || !_font) return shapeNative(text);
  const buffer = _hb.createBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  _hb.shape(_font, buffer);
  const glyphs = buffer.json();
  buffer.destroy();
  return glyphs.map((g) => ({
    glyphId: g.g,
    cluster: g.cl,
    xAdvance: g.ax,
    yAdvance: g.ay,
    xOffset: g.dx,
    yOffset: g.dy,
    char: text[g.cl],
  }));
}

function shapeNative(text) {
  const out = [];
  let i = 0;
  for (const ch of text) {
    out.push({
      glyphId: null,
      cluster: i,
      xAdvance: null,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 0,
      char: ch,
    });
    i += ch.length;
  }
  return out;
}

export function shapingMode() {
  return _mode;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config:
//   - assetsInclude for .wasm so harfbuzzjs (when used) ships its WASM
//   - run tests via vitest with jsdom
//   - exclude harfbuzzjs from optimizeDeps so its top-level Promise that
//     boots WASM does NOT run on app load. The shaper loads it lazily, only
//     when the Quranic font has been placed in public/fonts/.
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  server: { port: 5173, open: true },
  optimizeDeps: {
    exclude: ['harfbuzzjs'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
});

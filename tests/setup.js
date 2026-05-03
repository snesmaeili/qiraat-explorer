// vitest setup — runs before each test file. Adds @testing-library matchers
// and stubs fetch so the shaping module's WASM loader doesn't actually go
// over the network in tests.
import '@testing-library/jest-dom/vitest';

if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = async () => {
    throw new Error('fetch is stubbed in tests');
  };
}

import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// Route pages are React.lazy chunks (FOR-106). Under CPU load (e.g. `pnpm -r test` running the API
// Jest suite in parallel) the first dynamic import can take longer than the 1 s default, so
// findBy*/waitFor get more headroom. Assertions are unchanged; passing tests still resolve as soon
// as the element appears.
configure({ asyncUtilTimeout: 5000 });

// jsdom lacks matchMedia (used by some Radix primitives).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom lacks ResizeObserver (Recharts' ResponsiveContainer). Charts render at 0×0 in tests;
// assertions target their text (legends, captions, lists), not SVG geometry.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

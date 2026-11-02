/**
 * SSR-safety tests for src/components/providers
 *
 * Verifies that:
 *   1. Provider modules can be imported without throwing when browser globals
 *      are absent (SSR / prerendering).
 *   2. Browser-API side-effects in ThemeProvider (matchMedia, localStorage)
 *      are deferred to useEffect and never fire at module import time.
 *   3. The getHorizonProxyUrl helper (config/env) returns the correct value
 *      in both environments.
 *
 * Heavy transitive dependencies (Redux store, socket, auth slice) are mocked
 * so these tests stay focused on the SSR boundary and are not affected by
 * pre-existing parse issues elsewhere in the codebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports so Vitest hoists them.
// ---------------------------------------------------------------------------

vi.mock('@/store', () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(() => ({ ui: { mode: 'light' }, auth: {} })),
    subscribe: vi.fn(() => vi.fn()),
  },
  useAppDispatch: () => vi.fn(),
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({ ui: { mode: 'light' }, auth: {} }),
}));

vi.mock('@/store/slices/authSlice', () => ({
  initializeAuth: vi.fn(() => ({ type: 'auth/initializeAuth' })),
}));

vi.mock('@/store/slices/uiSlice', () => ({
  initializeUI: vi.fn(() => ({ type: 'ui/initializeUI' })),
  setTheme: vi.fn((t: string) => ({ type: 'ui/setTheme', payload: t })),
}));

vi.mock('@/services/api', () => ({
  default: {
    loadTokenFromStorage: vi.fn(),
    setStore: vi.fn(),
  },
}));

vi.mock('./SocketProvider', () => ({
  SocketProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./SessionManagementProvider', () => ({
  SessionManagementProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./PresenceProvider', () => ({
  PresenceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/TransactionToastListener', () => ({
  TransactionToastListener: () => null,
}));

vi.mock('./ToastOverflowManager', () => ({
  ToastOverflowManager: () => null,
}));

vi.mock('react-hot-toast', () => ({
  default: { dismiss: vi.fn() },
  Toaster: () => null,
}));

import React from 'react';

// ---------------------------------------------------------------------------
// ThemeProvider — browser: browser APIs not called at module import time
// ---------------------------------------------------------------------------

describe('ThemeProvider — browser environment', () => {
  beforeEach(() => {
    vi.resetModules();
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    vi.resetModules();
  });

  it('importing ThemeProvider does not call matchMedia before mount', async () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia');
    await import('./ThemeProvider');
    // matchMedia must only be called inside useEffect (after mount), never at
    // module evaluation time.
    expect(matchMediaSpy).not.toHaveBeenCalled();
    matchMediaSpy.mockRestore();
  });

  it('importing ThemeProvider does not read localStorage before mount', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    await import('./ThemeProvider');
    expect(getItemSpy).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — SSR: module import safe without window
// ---------------------------------------------------------------------------

describe('ThemeProvider — SSR environment (no window)', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    vi.resetModules();
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.resetModules();
  });

  it('can be imported without throwing when window is undefined', async () => {
    await expect(import('./ThemeProvider')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// LanguageProvider — SSR: module import safe without window
// ---------------------------------------------------------------------------

describe('LanguageProvider — SSR environment (no window)', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    vi.resetModules();
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.resetModules();
  });

  it('can be imported without throwing when window is undefined', async () => {
    await expect(import('./LanguageProvider')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getHorizonProxyUrl — SSR vs browser
// ---------------------------------------------------------------------------

describe('getHorizonProxyUrl — SSR vs browser', () => {
  const originalEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
  });

  afterEach(() => {
    if (originalEnvUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnvUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    vi.resetModules();
  });

  it('returns the relative /horizon path on the server (no window)', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
    vi.resetModules();
    try {
      const { getHorizonProxyUrl } = await import('@/config/env');
      expect(getHorizonProxyUrl()).toBe('/horizon');
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it('returns origin-prefixed URL in the browser', async () => {
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://test.example.com' },
      writable: true,
      configurable: true,
    });
    const { getHorizonProxyUrl } = await import('@/config/env');
    expect(getHorizonProxyUrl()).toBe('https://test.example.com/horizon');
  });
});

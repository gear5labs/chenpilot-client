import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// env object — static fields
// ---------------------------------------------------------------------------

describe('env object', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('exposes static process.env-backed values', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
    vi.resetModules();
    const { env } = await import('./env');
    expect(env.API_BASE_URL).toBe('http://localhost:2333');
    expect(typeof env.APP_NAME).toBe('string');
    expect(typeof env.NODE_ENV).toBe('string');
  });

  it('does not expose HORIZON_PROXY_URL on the env object (removed in favour of getHorizonProxyUrl)', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
    vi.resetModules();
    const { env } = await import('./env');
    // The frozen module-init value was replaced by the lazy getter function.
    expect((env as Record<string, unknown>).HORIZON_PROXY_URL).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getHorizonProxyUrl — browser environment (jsdom provides window)
// ---------------------------------------------------------------------------

describe('getHorizonProxyUrl — browser environment', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns origin-prefixed URL when window is available', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://app.example.com' },
      writable: true,
      configurable: true,
    });
    const { getHorizonProxyUrl } = await import('./env');
    expect(getHorizonProxyUrl()).toBe('https://app.example.com/horizon');
  });
});

// ---------------------------------------------------------------------------
// getHorizonProxyUrl — SSR environment (window removed)
// ---------------------------------------------------------------------------

describe('getHorizonProxyUrl — SSR environment (no window)', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
    vi.resetModules();
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.resetModules();
  });

  it('returns the relative /horizon path when window is undefined', async () => {
    const { getHorizonProxyUrl } = await import('./env');
    expect(getHorizonProxyUrl()).toBe('/horizon');
  });

  it('does not throw on import when window is undefined', async () => {
    await expect(import('./env')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// validateEnv
// ---------------------------------------------------------------------------

describe('validateEnv', () => {
  const backupUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (backupUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_BASE_URL = backupUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    vi.resetModules();
  });

  it('does not throw when NEXT_PUBLIC_API_BASE_URL is present', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:2333';
    vi.resetModules();
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws a descriptive error when NEXT_PUBLIC_API_BASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.resetModules();
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
    expect(() => validateEnv()).toThrow(/\.env\.local/);
  });
});

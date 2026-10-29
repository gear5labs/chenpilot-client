/**
 * Offline smoke test for the service worker this repository ships (#283).
 *
 * The real `public/service-worker.js` source is evaluated inside a simulated
 * worker scope (no mocks of its own logic): install, activate, then fetch events
 * while "online" and while "offline". The real-browser counterpart is
 * `e2e/offline-smoke.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

const ORIGIN = 'https://chenpilot.example';
const root = resolve(__dirname, '../../../public');

/** Inline the policy module so the worker script can run without a module loader. */
function loadWorkerSource(): string {
  const policy = readFileSync(resolve(root, 'offline-cache-policy.js'), 'utf8').replace(
    /^export\s+/gm,
    '',
  );
  const worker = readFileSync(resolve(root, 'service-worker.js'), 'utf8').replace(
    /^import .*offline-cache-policy\.js';\s*$/m,
    '',
  );
  return `${policy}\n${worker}`;
}

type Listener = (event: unknown) => void;

class FakeCache {
  readonly entries = new Map<string, Response>();
  async match(request: Request) {
    return this.entries.get(request.url)?.clone();
  }
  async put(request: Request, response: Response) {
    this.entries.set(request.url, response);
  }
}

function createWorker() {
  const listeners = new Map<string, Listener>();
  const caches = new Map<string, FakeCache>();
  const state = { online: true, networkHits: [] as string[], skipWaiting: false, claimed: false };

  const cacheStorage = {
    async open(name: string) {
      if (!caches.has(name)) caches.set(name, new FakeCache());
      return caches.get(name) as FakeCache;
    },
    async keys() {
      return [...caches.keys()];
    },
    async delete(name: string) {
      return caches.delete(name);
    },
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: async () => {
      state.skipWaiting = true;
    },
    clients: {
      claim: async () => {
        state.claimed = true;
      },
    },
  };

  const fakeFetch = async (request: Request) => {
    state.networkHits.push(request.url);
    if (!state.online) throw new TypeError('Failed to fetch');
    const headers = request.url.includes('/private') ? { 'Cache-Control': 'private' } : undefined;
    const response = new Response(`body:${new URL(request.url).pathname}`, { status: 200, headers });
    // Same-origin responses are `basic` in a real worker; a constructed Response is `default`.
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  };

  vm.runInNewContext(loadWorkerSource(), {
    self,
    caches: cacheStorage,
    fetch: fakeFetch,
    URL,
    Set,
    Promise,
    console,
  });

  /** Dispatches a fetch event; resolves to the response the worker produced, or `null` when it passes through. */
  async function dispatchFetch(url: string, method = 'GET'): Promise<Response | null> {
    let responded: Promise<Response> | null = null;
    const request = new Request(url, { method });
    listeners.get('fetch')?.({
      request: Object.assign(request, { type: 'basic' }),
      respondWith: (promise: Promise<Response>) => {
        responded = promise;
      },
    });
    return responded ? await (responded as Promise<Response>) : null;
  }

  async function lifecycle(type: 'install' | 'activate') {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => (pending = promise) });
    await pending;
  }

  return { state, caches, dispatchFetch, lifecycle };
}

describe('service worker offline smoke', () => {
  let worker: ReturnType<typeof createWorker>;

  beforeEach(async () => {
    worker = createWorker();
    await worker.lifecycle('install');
    await worker.lifecycle('activate');
  });

  it('installs and takes control without waiting', () => {
    expect(worker.state.skipWaiting).toBe(true);
    expect(worker.state.claimed).toBe(true);
  });

  it('serves an allowlisted static asset from the cache once offline', async () => {
    const asset = `${ORIGIN}/chenpilot.png`;

    const online = await worker.dispatchFetch(asset);
    expect(await online?.text()).toBe('body:/chenpilot.png');
    expect(worker.state.networkHits).toEqual([asset]);

    worker.state.online = false;
    const offline = await worker.dispatchFetch(asset);
    expect(offline?.ok).toBe(true);
    expect(await offline?.text()).toBe('body:/chenpilot.png');
    expect(worker.state.networkHits).toEqual([asset]);
  });

  it('serves Next build assets offline after they were fetched once', async () => {
    const chunk = `${ORIGIN}/_next/static/chunks/app.js`;
    await worker.dispatchFetch(chunk);
    worker.state.online = false;
    expect((await worker.dispatchFetch(chunk))?.ok).toBe(true);
  });

  it('does not cache or serve authenticated, wallet and navigation requests', async () => {
    const passthrough = [
      `${ORIGIN}/api/auth/session`,
      `${ORIGIN}/api/protected/profile`,
      `${ORIGIN}/api/v1/balance`,
      `${ORIGIN}/dashboard`,
      `${ORIGIN}/_next/image?url=%2Fchenpilot.png`,
      'https://cdn.example/chenpilot.png',
    ];
    for (const url of passthrough) {
      expect(await worker.dispatchFetch(url), url).toBeNull();
    }
    expect(worker.state.networkHits).toEqual([]);
    expect([...worker.caches.values()].every((cache) => cache.entries.size === 0)).toBe(true);
  });

  it('does not intercept non-GET requests', async () => {
    expect(await worker.dispatchFetch(`${ORIGIN}/chenpilot.png`, 'POST')).toBeNull();
  });

  it('fails an uncached asset while offline instead of inventing a response', async () => {
    worker.state.online = false;
    await expect(worker.dispatchFetch(`${ORIGIN}/vesu.jpg`)).rejects.toThrow('Failed to fetch');
  });

  it('removes older public caches on activate and keeps the current one', async () => {
    const stale = worker.caches.set('chenpilot-public-static-v0', new FakeCache());
    expect(stale.has('chenpilot-public-static-v0')).toBe(true);
    await worker.dispatchFetch(`${ORIGIN}/chenpilot.png`);
    await worker.lifecycle('activate');
    expect([...worker.caches.keys()]).toEqual(['chenpilot-public-static-v1']);
  });
});

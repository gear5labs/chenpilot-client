import { describe, expect, it, vi } from 'vitest';
import { isCacheablePublicResource } from '../../public/offline-cache-policy.js';
import {
  CACHE_NAME,
  CACHE_PREFIX,
  cleanupObsoleteCaches,
  obsoleteCacheNames,
} from '../../public/service-worker-cache.js';

const APP_ORIGIN = 'https://chenpilot.example';

describe('service-worker cache upgrade cleanup (#554)', () => {
  it('deletes the previous app cache while keeping the current version', async () => {
    const previous = `${CACHE_PREFIX}v0`;
    const deleteCache = vi.fn(async () => true);

    const deleted = await cleanupObsoleteCaches(
      { delete: deleteCache },
      [CACHE_NAME, previous],
      CACHE_NAME,
    );

    expect(deleted).toEqual([previous]);
    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith(previous);
    expect(deleteCache).not.toHaveBeenCalledWith(CACHE_NAME);
  });

  it('retains allowlisted resources in the cache used by the upgraded worker', async () => {
    const currentCache = new Map([
      [`${APP_ORIGIN}/_next/static/chunks/app.js`, 'cached-response'],
      [`${APP_ORIGIN}/manifest.webmanifest`, 'cached-response'],
    ]);
    const deleteCache = vi.fn(async (name: string) => {
      if (name !== CACHE_NAME) currentCache.delete(name);
      return true;
    });

    await cleanupObsoleteCaches(
      { delete: deleteCache },
      [`${CACHE_PREFIX}v0`, CACHE_NAME],
      CACHE_NAME,
    );

    expect(
      isCacheablePublicResource(`${APP_ORIGIN}/_next/static/chunks/app.js`, 'GET', APP_ORIGIN),
    ).toBe(true);
    expect(
      isCacheablePublicResource(`${APP_ORIGIN}/manifest.webmanifest`, 'GET', APP_ORIGIN),
    ).toBe(true);
    expect(currentCache.has(`${APP_ORIGIN}/_next/static/chunks/app.js`)).toBe(true);
    expect(currentCache.has(`${APP_ORIGIN}/manifest.webmanifest`)).toBe(true);
  });

  it('cleans only ChenPilot-owned static caches, not unrelated origin storage', () => {
    const ownedOld = `${CACHE_PREFIX}v0`;
    const names = [
      ownedOld,
      CACHE_NAME,
      'workbox-precache-v2',
      'other-app-static-v1',
      'chenpilot-notes-v1',
      'chenpilot-public-static',
    ];

    expect(obsoleteCacheNames(names, CACHE_NAME)).toEqual([ownedOld]);
  });

  it('returns the obsolete names without throwing when CacheStorage is unavailable', async () => {
    const deleted = await cleanupObsoleteCaches(
      undefined,
      [`${CACHE_PREFIX}v0`, CACHE_NAME],
      CACHE_NAME,
    );

    expect(deleted).toEqual([`${CACHE_PREFIX}v0`]);
  });
});

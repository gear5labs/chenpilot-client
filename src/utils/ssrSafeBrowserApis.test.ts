import { describe, expect, it } from 'vitest';
import {
  isBrowserRuntime,
  safeBrowserStorageGet,
  safeBrowserStorageRemove,
  safeBrowserStorageSet,
} from './ssrSafeBrowserApis';

describe('ssrSafeBrowserApis (#333)', () => {
  it('reads, writes, and removes browser localStorage entries safely in jsdom', () => {
    expect(isBrowserRuntime()).toBe(true);
    expect(safeBrowserStorageSet('chenpilot:test-ssr', 'ready')).toBe(true);
    expect(safeBrowserStorageGet('chenpilot:test-ssr', 'fallback')).toBe('ready');
    expect(safeBrowserStorageRemove('chenpilot:test-ssr')).toBe(true);
    expect(safeBrowserStorageGet('chenpilot:test-ssr', 'fallback')).toBe('fallback');
  });
});

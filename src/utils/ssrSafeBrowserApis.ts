/**
 * SSR-safe wrappers for browser-only APIs (window, document, localStorage) (#333).
 */
export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function safeBrowserStorageGet(key: string, fallback: string | null = null): string | null {
  if (!isBrowserRuntime()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeBrowserStorageSet(key: string, value: string): boolean {
  if (!isBrowserRuntime()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeBrowserStorageRemove(key: string): boolean {
  if (!isBrowserRuntime()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

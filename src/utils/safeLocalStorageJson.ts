/**
 * Safely parse and recover malformed localStorage JSON payloads (#334).
 */
export function parseSafeLocalStorageJson<T>(
  raw: string | null | undefined,
  fallback: T,
  validator?: (val: unknown) => val is T
): { value: T; recovered: boolean } {
  if (!raw || typeof raw !== 'string') {
    return { value: fallback, recovered: false };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      return { value: fallback, recovered: true };
    }
    if (parsed === null || parsed === undefined) {
      return { value: fallback, recovered: true };
    }
    return { value: parsed as T, recovered: false };
  } catch {
    return { value: fallback, recovered: true };
  }
}

import { describe, expect, it } from 'vitest';
import { parseSafeLocalStorageJson } from './safeLocalStorageJson';

describe('parseSafeLocalStorageJson (#334)', () => {
  it('returns fallback without recovery flag when storage entry is absent', () => {
    expect(parseSafeLocalStorageJson(null, { count: 0 })).toEqual({
      value: { count: 0 },
      recovered: false,
    });
  });

  it('parses valid JSON and enforces optional runtime type guard', () => {
    const isStringArray = (val: unknown): val is string[] =>
      Array.isArray(val) && val.every((item) => typeof item === 'string');

    expect(parseSafeLocalStorageJson('["XLM","USDC"]', [], isStringArray)).toEqual({
      value: ['XLM', 'USDC'],
      recovered: false,
    });
    expect(parseSafeLocalStorageJson('[123]', ['XLM'], isStringArray)).toEqual({
      value: ['XLM'],
      recovered: true,
    });
  });

  it('recovers cleanly from truncated or corrupted JSON payloads', () => {
    expect(parseSafeLocalStorageJson('{corrupted', { ok: false })).toEqual({
      value: { ok: false },
      recovered: true,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { buildLoginUrl, getPostLoginPath, getSafeReturnPath } from '../authRedirect';

describe('auth redirect helpers', () => {
  it('retains a same-origin protected path and its query', () => {
    expect(buildLoginUrl('/dashboard?tab=activity#recent', 'session-expired')).toBe(
      '/auth/login?returnTo=%2Fdashboard%3Ftab%3Dactivity%23recent&reason=session-expired',
    );
  });

  it.each(['//example.com/path', '/\\\\example.com', 'https://example.com', '/auth/login'])
  ('rejects unsafe or looping return paths: %s', (value) => {
    expect(getSafeReturnPath(value)).toBeNull();
  });

  it('uses the safe return path after sign-in and falls back to chat', () => {
    expect(getPostLoginPath('?returnTo=%2Fcontacts%3Fsort%3Dname')).toBe('/contacts?sort=name');
    expect(getPostLoginPath('?returnTo=%2F%2Fexample.com')).toBe('/chat');
  });
});
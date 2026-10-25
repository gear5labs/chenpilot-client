import { describe, expect, it } from 'vitest';
import { validateApiBaseUrl } from './apiBaseUrlValidation';

describe('validateApiBaseUrl (#335)', () => {
  it('normalizes valid http and https base URLs without trailing slashes', () => {
    expect(validateApiBaseUrl('https://api.chenpilot.xyz/v1///')).toEqual({
      valid: true,
      normalizedUrl: 'https://api.chenpilot.xyz/v1',
    });
    expect(validateApiBaseUrl('http://localhost:8000/api/')).toEqual({
      valid: true,
      normalizedUrl: 'http://localhost:8000/api',
    });
  });

  it('rejects empty, unsupported protocol, and malformed URLs consistently', () => {
    expect(validateApiBaseUrl('   ').valid).toBe(false);
    expect(validateApiBaseUrl(undefined).valid).toBe(false);
    expect(validateApiBaseUrl('ftp://api.chenpilot.xyz').reason).toContain('Unsupported protocol');
    expect(validateApiBaseUrl('not-a-valid-url').reason).toBe('Malformed URL syntax');
  });
});

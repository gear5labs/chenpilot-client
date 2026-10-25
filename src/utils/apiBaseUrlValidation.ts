/**
 * Consistent API base URL validation shared across startup checks and HTTP/WebSocket clients (#335).
 */
export interface ApiBaseUrlValidationResult {
  valid: boolean;
  normalizedUrl: string;
  reason?: string;
}

export function validateApiBaseUrl(rawUrl: string | undefined | null): ApiBaseUrlValidationResult {
  const candidate = (rawUrl || '').trim();
  if (!candidate) {
    return { valid: false, normalizedUrl: '', reason: 'API base URL is empty' };
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalizedUrl: '', reason: `Unsupported protocol: ${parsed.protocol}` };
    }
    return { valid: true, normalizedUrl: parsed.toString().replace(/\/+$/, '') };
  } catch {
    return { valid: false, normalizedUrl: '', reason: 'Malformed URL syntax' };
  }
}

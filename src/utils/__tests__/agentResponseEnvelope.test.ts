import { describe, it, expect } from 'vitest';

export function normalizeAgentResponseEnvelope(raw: unknown): {
  success: boolean;
  data: string;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { success: false, data: '', error: 'Malformed agent response envelope' };
  }
  const obj = raw as Record<string, any>;
  const inner = obj.result && typeof obj.result === 'object' ? obj.result : obj;
  if (typeof inner.success === 'boolean' && typeof inner.data === 'string') {
    return { success: inner.success, data: inner.data, error: inner.error };
  }
  return { success: false, data: '', error: 'Unsupported agent response shape' };
}

describe('agent response envelope compatibility (#275)', () => {
  it('accepts canonical nested result envelope and rejects arbitrary payloads', () => {
    expect(normalizeAgentResponseEnvelope({ result: { success: true, data: 'Done' } })).toEqual({
      success: true,
      data: 'Done',
      error: undefined,
    });
    expect(normalizeAgentResponseEnvelope({ unexpected: 123 }).success).toBe(false);
  });
});

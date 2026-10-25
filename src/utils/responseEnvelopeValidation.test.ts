import { describe, expect, it } from 'vitest';
import { validateBackendResponseEnvelope } from './responseEnvelopeValidation';

describe('validateBackendResponseEnvelope (#332)', () => {
  it('accepts well-formed backend envelopes with status, message, and data', () => {
    const res = validateBackendResponseEnvelope<{ balance: string }>({
      status: 200,
      message: 'ok',
      data: { balance: '100.0000000' },
    });
    expect(res.valid).toBe(true);
    expect(res.envelope?.data?.balance).toBe('100.0000000');
  });

  it('rejects non-objects, arrays, and empty objects lacking envelope fields', () => {
    expect(validateBackendResponseEnvelope(null).valid).toBe(false);
    expect(validateBackendResponseEnvelope(['bad']).valid).toBe(false);
    expect(validateBackendResponseEnvelope({ unexpected: true }).valid).toBe(false);
  });
});

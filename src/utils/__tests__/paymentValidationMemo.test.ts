import { describe, it, expect } from 'vitest';
import { validateSendPayment, validateMemo } from '../validation';

describe('payment validation and conditional memo behavior (#344)', () => {
  const validAddress = 'G' + 'A'.repeat(55);

  it('accepts a valid XLM payment without memo', () => {
    const res = validateSendPayment({
      recipientAddress: validAddress,
      amount: '12.5',
      tokenType: 'XLM',
      memoType: 'none',
    });
    expect(res.isValid).toBe(true);
  });

  it('validates conditional numeric memo IDs and 64-hex memo hashes', () => {
    expect(validateMemo('123456789', 'id')).toBe(true);
    expect(validateMemo('not-a-number', 'id')).toBe(false);
    expect(validateMemo('a'.repeat(64), 'hash')).toBe(true);
    expect(validateMemo('short-hash', 'hash')).toBe(false);
  });
});

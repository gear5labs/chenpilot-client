import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  computeBackoffMs,
  isRetryableError,
  RETRY_POLICY,
  DEFAULT_RETRY_POLICY,
  resolveRetryPolicy,
} from './retryUtils';

function makeAxiosError(options: {
  method?: string;
  status?: number;
  paymentOperation?: boolean;
  retryCount?: number;
  headers?: Record<string, string>;
}): AxiosError {
  return {
    config: {
      method: options.method ?? 'get',
      url: options.paymentOperation ? '/payments' : '/health',
      paymentOperation: options.paymentOperation,
      _retryCount: options.retryCount ?? 0,
    },
    response: options.status === undefined ? undefined : {
      status: options.status,
      statusText: 'error',
      headers: options.headers ?? {},
      config: {} as never,
      data: {},
    },
  } as unknown as AxiosError;
}

describe('payment retry safety', () => {
  it('never retries a payment operation, including 503 responses', () => {
    expect(isRetryableError(makeAxiosError({ method: 'post', status: 503, paymentOperation: true }))).toBe(false);
    expect(isRetryableError(makeAxiosError({ method: 'post', paymentOperation: true }))).toBe(false);
  });

  it('continues to retry eligible idempotent requests', () => {
    expect(isRetryableError(makeAxiosError({ method: 'get', status: 503 }))).toBe(true);
  });
});

describe('exported retry policy configuration', () => {
  it('exports RETRY_POLICY and DEFAULT_RETRY_POLICY with canonical defaults', () => {
    expect(RETRY_POLICY).toBeDefined();
    expect(DEFAULT_RETRY_POLICY).toBe(RETRY_POLICY);
    expect(RETRY_POLICY.maxAttempts).toBe(3);
    expect(RETRY_POLICY.baseDelayMs).toBe(1000);
    expect(RETRY_POLICY.maxDelayMs).toBe(30000);
    expect(RETRY_POLICY.jitterMs).toBe(1000);
    expect(RETRY_POLICY.idempotentMethods).toContain('get');
    expect(RETRY_POLICY.retryableStatusCodes).toContain(503);
    expect(RETRY_POLICY.retryableStatusCodes).toContain(429);
    expect(RETRY_POLICY.retryableStatusCodes).toContain(408);
  });

  it('resolves partial policies against defaults', () => {
    const resolved = resolveRetryPolicy({ maxAttempts: 5, baseDelayMs: 500 });
    expect(resolved.maxAttempts).toBe(5);
    expect(resolved.baseDelayMs).toBe(500);
    expect(resolved.maxDelayMs).toBe(RETRY_POLICY.maxDelayMs);
    expect(resolved.jitterMs).toBe(RETRY_POLICY.jitterMs);
  });
});

describe('max attempts enforcement and configurability', () => {
  it('permits retry when attempt count is below maxAttempts in default policy', () => {
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 0 }))).toBe(true);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 1 }))).toBe(true);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 2 }))).toBe(true);
  });

  it('denies retry once attempt count reaches or exceeds default maxAttempts (3)', () => {
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 3 }))).toBe(false);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 4 }))).toBe(false);
  });

  it('honours configured maxAttempts when a custom policy is supplied', () => {
    const customPolicy = { maxAttempts: 5 };
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 3 }), customPolicy)).toBe(true);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 4 }), customPolicy)).toBe(true);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 5 }), customPolicy)).toBe(false);

    const strictPolicy = { maxAttempts: 1 };
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 0 }), strictPolicy)).toBe(true);
    expect(isRetryableError(makeAxiosError({ status: 503, retryCount: 1 }), strictPolicy)).toBe(false);
  });
});

describe('backoff jitter bounds', () => {
  const error = makeAxiosError({ status: 500 });

  it('computes exact lower bound when random is 0', () => {
    const zeroRandom = () => 0;
    expect(computeBackoffMs(0, error, RETRY_POLICY, zeroRandom)).toBe(1000);
    expect(computeBackoffMs(1, error, RETRY_POLICY, zeroRandom)).toBe(2000);
    expect(computeBackoffMs(2, error, RETRY_POLICY, zeroRandom)).toBe(4000);
    expect(computeBackoffMs(3, error, RETRY_POLICY, zeroRandom)).toBe(8000);
    expect(computeBackoffMs(4, error, RETRY_POLICY, zeroRandom)).toBe(16000);
    // 1000 * 2^5 = 32000 > maxDelayMs (30000) -> capped at 30000
    expect(computeBackoffMs(5, error, RETRY_POLICY, zeroRandom)).toBe(30000);
    expect(computeBackoffMs(6, error, RETRY_POLICY, zeroRandom)).toBe(30000);
  });

  it('computes exact upper bound when random is 1', () => {
    const maxRandom = () => 1;
    expect(computeBackoffMs(0, error, RETRY_POLICY, maxRandom)).toBe(2000); // 1000 + 1000
    expect(computeBackoffMs(1, error, RETRY_POLICY, maxRandom)).toBe(3000); // 2000 + 1000
    expect(computeBackoffMs(2, error, RETRY_POLICY, maxRandom)).toBe(5000); // 4000 + 1000
    expect(computeBackoffMs(5, error, RETRY_POLICY, maxRandom)).toBe(31000); // 30000 + 1000
  });

  it('computes midpoint when random is 0.5', () => {
    const midRandom = () => 0.5;
    expect(computeBackoffMs(0, error, RETRY_POLICY, midRandom)).toBe(1500); // 1000 + 500
    expect(computeBackoffMs(1, error, RETRY_POLICY, midRandom)).toBe(2500); // 2000 + 500
  });

  it('respects custom policy delay and jitter bounds', () => {
    const customPolicy = {
      baseDelayMs: 500,
      maxDelayMs: 2500,
      jitterMs: 200,
    };
    const zeroRandom = () => 0;
    const maxRandom = () => 1;

    // attempt 0: base 500ms
    expect(computeBackoffMs(0, error, customPolicy, zeroRandom)).toBe(500);
    expect(computeBackoffMs(0, error, customPolicy, maxRandom)).toBe(700);

    // attempt 3: 500 * 8 = 4000 -> capped at 2500ms
    expect(computeBackoffMs(3, error, customPolicy, zeroRandom)).toBe(2500);
    expect(computeBackoffMs(3, error, customPolicy, maxRandom)).toBe(2700);
  });

  it('keeps all natural random calculations within the computed jitter bounds', () => {
    for (let i = 0; i < 50; i++) {
      const delay = computeBackoffMs(1, error);
      // attempt 1: base 2000ms + random(0, 1000ms) -> range [2000, 3000]
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(3000);
    }
  });
});

describe('Retry-After header handling', () => {
  it('parses numeric seconds from lowercase retry-after header', () => {
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': '5' },
    });
    expect(computeBackoffMs(0, error)).toBe(5000);
  });

  it('parses numeric seconds from case-insensitive Retry-After header', () => {
    const error = makeAxiosError({
      status: 429,
      headers: { 'Retry-After': '7' },
    });
    expect(computeBackoffMs(0, error)).toBe(7000);
  });

  it('handles Retry-After: 0 seconds correctly', () => {
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': '0' },
    });
    expect(computeBackoffMs(0, error)).toBe(0);
  });

  it('caps numeric Retry-After at maxDelayMs', () => {
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': '120' }, // 120 seconds = 120000ms > 30000ms
    });
    expect(computeBackoffMs(0, error)).toBe(30000);

    // With custom policy maxDelayMs
    expect(computeBackoffMs(0, error, { maxDelayMs: 15000 })).toBe(15000);
  });

  it('parses future HTTP-date Retry-After header and caps at maxDelayMs', () => {
    const futureDate = new Date(Date.now() + 10000).toUTCString();
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': futureDate },
    });
    const delay = computeBackoffMs(0, error);
    // Allow slight execution tolerance around 10000ms
    expect(delay).toBeGreaterThan(8000);
    expect(delay).toBeLessThanOrEqual(10000);
  });

  it('returns 0 for past HTTP-date Retry-After header', () => {
    const pastDate = new Date(Date.now() - 5000).toUTCString();
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': pastDate },
    });
    expect(computeBackoffMs(0, error)).toBe(0);
  });

  it('falls back to exponential backoff when Retry-After is malformed', () => {
    const error = makeAxiosError({
      status: 429,
      headers: { 'retry-after': 'not-a-valid-date-or-number' },
    });
    const delay = computeBackoffMs(0, error, RETRY_POLICY, () => 0);
    expect(delay).toBe(1000);
  });
});

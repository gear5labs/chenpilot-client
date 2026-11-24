import { describe, it, expect } from 'vitest';
import uiReducer, { setRetryStatus, clearRetryStatus } from '../uiSlice';
import { RETRY_POLICY } from '@/utils/retryUtils';

describe('uiSlice retryStatus state', () => {
  const initial = uiReducer(undefined, { type: '@@INIT' });

  it('starts with retryStatus as null', () => {
    expect(initial.retryStatus).toBeNull();
  });

  it('sets retryStatus when all fields are provided', () => {
    const next = uiReducer(
      initial,
      setRetryStatus({
        label: 'GET /auth/me',
        attempt: 2,
        maxAttempts: 5,
        nextRetryAt: 123456789,
      }),
    );

    expect(next.retryStatus).toEqual({
      label: 'GET /auth/me',
      attempt: 2,
      maxAttempts: 5,
      nextRetryAt: 123456789,
    });
  });

  it('defaults maxAttempts to RETRY_POLICY.maxAttempts when omitted', () => {
    const next = uiReducer(
      initial,
      setRetryStatus({
        label: 'GET /contacts',
        attempt: 1,
        nextRetryAt: 987654321,
      }),
    );

    expect(next.retryStatus).toEqual({
      label: 'GET /contacts',
      attempt: 1,
      maxAttempts: RETRY_POLICY.maxAttempts,
      nextRetryAt: 987654321,
    });
  });

  it('clears retryStatus back to null', () => {
    const withStatus = uiReducer(
      initial,
      setRetryStatus({
        label: 'GET /contacts',
        attempt: 1,
        maxAttempts: 3,
        nextRetryAt: 987654321,
      }),
    );
    expect(withStatus.retryStatus).not.toBeNull();

    const cleared = uiReducer(withStatus, clearRetryStatus());
    expect(cleared.retryStatus).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeApiError,
  isNormalizedApiError,
  NormalizedApiError,
} from '../apiErrors';
import authService from '../auth.service';
import apiService from '../api';
import contactsReducer, {
  getContacts,
  createContact,
} from '@/store/slices/contactsSlice';
import { configureStore } from '@reduxjs/toolkit';

describe('normalizeApiError (#323)', () => {
  it('preserves HTTP status code and marks non-retryable 4xx errors', () => {
    const error400 = {
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: { message: 'Invalid recipient address' },
      },
    };

    const normalized = normalizeApiError(error400);
    expect(normalized.status).toBe(400);
    expect(normalized.retryable).toBe(false);
    expect(normalized.message).toBe('Invalid recipient address');
  });

  it('preserves HTTP 404 status and marks non-retryable', () => {
    const error404 = {
      response: {
        status: 404,
        data: { message: 'Transaction not found' },
      },
    };

    const normalized = normalizeApiError(error404);
    expect(normalized.status).toBe(404);
    expect(normalized.retryable).toBe(false);
    expect(normalized.message).toBe('Transaction not found');
  });

  it('marks rate limits (429) and temporary outages (503) as retryable', () => {
    const error429 = {
      response: {
        status: 429,
        data: { message: 'Rate limit exceeded' },
      },
    };
    const norm429 = normalizeApiError(error429);
    expect(norm429.status).toBe(429);
    expect(norm429.retryable).toBe(true);

    const error503 = {
      response: {
        status: 503,
        data: { message: 'Horizon service temporarily unavailable' },
      },
    };
    const norm503 = normalizeApiError(error503);
    expect(norm503.status).toBe(503);
    expect(norm503.retryable).toBe(true);
  });

  it('marks network and connection errors as retryable with user-friendly message', () => {
    const networkError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };
    const normalized = normalizeApiError(networkError);
    expect(normalized.retryable).toBe(true);
    expect(normalized.status).toBeUndefined();
    expect(normalized.message).toBe(
      "Unable to connect to the server. Check your network connection and try again.",
    );
  });

  it('preserves correlation ID from response headers or error config', () => {
    const errorWithHeader = {
      response: {
        status: 500,
        headers: {
          'x-correlation-id': 'stellar_tx_123_abc',
        },
        data: { message: 'Service failure' },
      },
    };
    const normalized = normalizeApiError(errorWithHeader);
    expect(normalized.correlationId).toBe('stellar_tx_123_abc');

    const errorWithMetadata = {
      correlationId: 'http_999_xyz',
      response: {
        status: 400,
        data: { message: 'Bad request' },
      },
    };
    const normMetadata = normalizeApiError(errorWithMetadata);
    expect(normMetadata.correlationId).toBe('http_999_xyz');
  });

  it('redacts database syntax errors and stack traces', () => {
    const dbError = {
      response: {
        status: 500,
        data: {
          message:
            'PostgresError: syntax error at or near "SELECT" at /var/app/db/query.ts:45',
        },
      },
    };
    const normalized = normalizeApiError(dbError);
    expect(normalized.message).toBe(
      'An internal server error occurred. Please try again later.',
    );
    expect(normalized.message).not.toContain('PostgresError');
    expect(normalized.message).not.toContain('/var/app');
  });

  it('redacts internal filesystem paths and socket addresses', () => {
    const pathError = {
      response: {
        status: 500,
        data: {
          message:
            'ENOENT: no such file or directory, open \'/home/node/app/src/secrets/key.pem\'',
        },
      },
    };
    const normPath = normalizeApiError(pathError);
    expect(normPath.message).toBe(
      'An internal server error occurred. Please try again later.',
    );
    expect(normPath.message).not.toContain('/home/node');

    const connError = {
      message: 'connect ECONNREFUSED 127.0.0.1:5432',
    };
    const normConn = normalizeApiError(connError);
    expect(normConn.message).toBe(
      'An unexpected error occurred. Please try again.',
    );
    expect(normConn.message).not.toContain('127.0.0.1');
  });

  it('preserves fieldErrors and details from validation failures', () => {
    const validationError = {
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: {
            amount: 'Amount must be greater than 0',
            recipient: 'Invalid Stellar address',
          },
        },
      },
    };
    const normalized = normalizeApiError(validationError);
    expect(normalized.status).toBe(422);
    expect(normalized.fieldErrors).toEqual({
      amount: 'Amount must be greater than 0',
      recipient: 'Invalid Stellar address',
    });
  });

  it('returns instance of NormalizedApiError with toJSON support', () => {
    const error = new NormalizedApiError({
      message: 'Safe user message',
      status: 400,
      retryable: false,
      correlationId: 'tx_corr_1',
    });

    expect(isNormalizedApiError(error)).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(error.toJSON()).toEqual({
      message: 'Safe user message',
      status: 400,
      retryable: false,
      correlationId: 'tx_corr_1',
      code: undefined,
      details: undefined,
      fieldErrors: undefined,
    });
  });

  it('does not re-wrap an already normalized error', () => {
    const first = normalizeApiError({ response: { status: 404, data: { message: 'Not found' } } });
    const second = normalizeApiError(first);
    expect(second).toBe(first);
  });
});

describe('migrated representative flows (#323)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('auth flow: authService.reauthenticate rethrows a NormalizedApiError with redacted internals', async () => {
    vi.spyOn(apiService, 'reauthenticate').mockRejectedValueOnce({
      response: {
        status: 500,
        headers: { 'x-correlation-id': 'reauth_corr_123' },
        data: {
          message: 'PostgresError: syntax error at or near "UPDATE users"',
        },
      },
    });

    await expect(
      authService.reauthenticate('user@example.com', 'secretPassword123'),
    ).rejects.toSatisfy((err: unknown) => {
      expect(isNormalizedApiError(err)).toBe(true);
      const normalized = err as NormalizedApiError;
      expect(normalized.status).toBe(500);
      expect(normalized.correlationId).toBe('reauth_corr_123');
      expect(normalized.message).toBe(
        'An internal server error occurred. Please try again later.',
      );
      expect(normalized.message).not.toContain('PostgresError');
      return true;
    });
  });

  it('contact flow: getContacts and createContact reject with normalized error messages', async () => {
    vi.spyOn(apiService, 'getContacts').mockRejectedValueOnce({
      response: {
        status: 503,
        data: { message: 'Database connection failed at /var/app/pool.js:20' },
      },
    });

    const store = configureStore({ reducer: { contacts: contactsReducer } });
    const getResult = await store.dispatch(getContacts());
    expect(getResult.type).toBe('contacts/getContacts/rejected');
    expect(getResult.payload).toBe(
      'An internal server error occurred. Please try again later.',
    );

    vi.spyOn(apiService, 'createContact').mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'Contact with this address already exists' },
      },
    });

    const createResult = await store.dispatch(
      createContact({
        name: 'Bob',
        address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456',
        tokenType: 'XLM',
      }),
    );
    expect(createResult.type).toBe('contacts/createContact/rejected');
    expect(createResult.payload).toBe('Contact with this address already exists');
  });

  it('wallet flow: send payment normalization preserves correlation ID and redacts server errors', () => {
    const paymentError = {
      response: {
        status: 500,
        headers: { 'x-correlation-id': 'pay_corr_777' },
        data: {
          message: 'horizon server at 127.0.0.1:8000 returned 500: stack trace /app/worker.ts',
        },
      },
    };

    const normalized = normalizeApiError(paymentError, 'Failed to send payment');
    expect(normalized.status).toBe(500);
    expect(normalized.correlationId).toBe('pay_corr_777');
    expect(normalized.message).toBe('An internal server error occurred. Please try again later.');
    expect(normalized.message).not.toContain('127.0.0.1');
    expect(normalized.message).not.toContain('/app/worker.ts');
  });
});

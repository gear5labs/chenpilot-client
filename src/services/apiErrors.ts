import {
  correlationIdForError,
  extractCorrelationId,
  redactServerInternals,
  isServerInternalMessage,
} from '../utils/logger';
import { isRetryableError } from '@/utils/retryUtils';

/**
 * Normalized API error representation preserving transport metadata
 * while ensuring server internals and sensitive data are redacted.
 */
export interface NormalizedApiErrorData {
  message: string;
  status?: number;
  retryable: boolean;
  correlationId?: string;
  code?: string;
  details?: unknown;
  fieldErrors?: Record<string, string>;
}

/**
 * Application error class thrown or returned at service boundaries.
 * Guarantees a safe user-facing message, preserved status code, retryability,
 * and correlation ID.
 */
export class NormalizedApiError extends Error implements NormalizedApiErrorData {
  readonly status?: number;
  readonly retryable: boolean;
  readonly correlationId?: string;
  readonly code?: string;
  readonly details?: unknown;
  readonly fieldErrors?: Record<string, string>;
  readonly isNormalized = true;

  constructor(
    messageOrData: string | NormalizedApiErrorData,
    options: Omit<NormalizedApiErrorData, 'message'> = { retryable: false }
  ) {
    const data: NormalizedApiErrorData =
      typeof messageOrData === 'string'
        ? { message: messageOrData, ...options }
        : messageOrData;

    super(data.message);
    this.name = 'NormalizedApiError';
    this.status = data.status;
    this.retryable = data.retryable;
    this.correlationId = data.correlationId;
    this.code = data.code;
    this.details = data.details;
    this.fieldErrors = data.fieldErrors;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): NormalizedApiErrorData {
    return {
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      correlationId: this.correlationId,
      code: this.code,
      details: this.details,
      fieldErrors: this.fieldErrors,
    };
  }
}

/**
 * Type guard for NormalizedApiError or an object adhering to its shape.
 */
export function isNormalizedApiError(error: unknown): error is NormalizedApiError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error instanceof NormalizedApiError || (error as { isNormalized?: unknown }).isNormalized === true)
  );
}

/**
 * Normalizes any error (AxiosError, Error instance, string, or backend response envelope)
 * into a single safe NormalizedApiError shape.
 *
 * - Preserves HTTP status code when present
 * - Detects and preserves retryability (429, 503, network disconnects)
 * - Extracts correlation ID from metadata headers
 * - Redacts server internals (stack traces, SQL/database errors, internal paths)
 */
export function normalizeApiError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): NormalizedApiError {
  if (isNormalizedApiError(error)) {
    return error;
  }

  let status: number | undefined;
  let correlationId: string | undefined;
  let retryable = false;
  let code: string | undefined;
  let details: unknown;
  let fieldErrors: Record<string, string> | undefined;
  let rawMessage: string | undefined;

  if (error && typeof error === 'object') {
    const err = error as {
      status?: unknown;
      statusCode?: unknown;
      response?: {
        status?: unknown;
        headers?: unknown;
        data?: unknown;
      };
      config?: { headers?: unknown };
      code?: unknown;
      message?: unknown;
      correlationId?: unknown;
      retryable?: unknown;
      isRetryable?: unknown;
      errors?: unknown;
      fieldErrors?: unknown;
      details?: unknown;
    };

    // Extract status code
    if (typeof err.response?.status === 'number') {
      status = err.response.status;
    } else if (typeof err.status === 'number') {
      status = err.status;
    } else if (typeof err.statusCode === 'number') {
      status = err.statusCode;
    }

    // Extract correlation ID
    correlationId =
      correlationIdForError(error) ??
      extractCorrelationId(err.response?.headers) ??
      extractCorrelationId(err.config?.headers);

    // Determine retryability
    if (typeof err.retryable === 'boolean') {
      retryable = err.retryable;
    } else if (typeof err.isRetryable === 'boolean') {
      retryable = err.isRetryable;
    } else if (status === 429 || status === 408 || status === 502 || status === 503 || status === 504) {
      retryable = true;
    } else if (isRetryableError(error)) {
      retryable = true;
    } else if (!status && typeof err.message === 'string' && /network|timeout|abort|econnrefused/i.test(err.message)) {
      retryable = true;
    }

    // Extract error code
    if (typeof err.code === 'string') {
      code = err.code;
    } else if (err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as { code?: unknown; error?: unknown };
      if (typeof data.code === 'string') {
        code = data.code;
      }
    }

    // Extract fieldErrors and details
    if (err.fieldErrors && typeof err.fieldErrors === 'object') {
      fieldErrors = err.fieldErrors as Record<string, string>;
    } else if (err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as { errors?: unknown; details?: unknown };
      if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        fieldErrors = Object.entries(data.errors).reduce<Record<string, string>>((acc, [k, v]) => {
          if (typeof v === 'string') acc[k] = v;
          else if (Array.isArray(v) && typeof v[0] === 'string') acc[k] = v[0];
          return acc;
        }, {});
      }
      details = data.details ?? data.errors;
    }

    // Extract raw message
    if (err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as { message?: unknown; error?: unknown };
      if (typeof data.message === 'string' && data.message.trim()) {
        rawMessage = data.message;
      } else if (typeof data.error === 'string' && data.error.trim()) {
        rawMessage = data.error;
      }
    }

    if (!rawMessage && typeof err.message === 'string' && err.message.trim()) {
      rawMessage = err.message;
    }
  } else if (typeof error === 'string') {
    rawMessage = error;
  }

  // Handle standard status code mappings and redact server internals
  let safeMessage: string;

  if (status === 404) {
    safeMessage = rawMessage && !isServerInternalMessage(rawMessage)
      ? redactServerInternals(rawMessage, 'The requested resource was not found.')
      : 'The requested resource was not found.';
  } else if (status === 429) {
    safeMessage = rawMessage && !isServerInternalMessage(rawMessage)
      ? redactServerInternals(rawMessage, 'Rate limit exceeded. Please try again later.')
      : 'Rate limit exceeded. Please try again later.';
  } else if (status && status >= 500) {
    safeMessage = redactServerInternals(
      rawMessage ?? '',
      'An internal server error occurred. Please try again later.'
    );
  } else if (status === 401 || status === 403) {
    if (code === 'REAUTH_REQUIRED') {
      safeMessage = 'Re-authentication required to complete this action.';
    } else {
      safeMessage = rawMessage
        ? redactServerInternals(rawMessage, 'Authentication failed. Please check your credentials.')
        : 'Authentication failed. Please check your credentials.';
    }
  } else if (!status && rawMessage && /network error|failed to fetch|load failed/i.test(rawMessage)) {
    safeMessage = 'Unable to connect to the server. Check your network connection and try again.';
  } else if (rawMessage) {
    safeMessage = redactServerInternals(rawMessage, fallbackMessage);
  } else {
    safeMessage = fallbackMessage;
  }

  return new NormalizedApiError(safeMessage, {
    status,
    retryable,
    correlationId,
    code,
    details,
    fieldErrors,
  });
}

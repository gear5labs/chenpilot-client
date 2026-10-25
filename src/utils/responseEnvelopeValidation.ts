/**
 * Runtime schema validator for backend response envelopes (#332).
 */
export interface ValidatedBackendEnvelope<T = unknown> {
  status: number;
  message: string;
  data?: T;
  error?: string;
}

export function validateBackendResponseEnvelope<T = unknown>(raw: unknown): {
  valid: boolean;
  envelope: ValidatedBackendEnvelope<T> | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, envelope: null, errors: ['Envelope must be a non-null object'] };
  }
  const obj = raw as Record<string, unknown>;
  const status = typeof obj.status === 'number' ? obj.status : 200;
  const message = typeof obj.message === 'string' ? obj.message : '';
  if (typeof obj.status !== 'number' && typeof obj.message !== 'string' && !('data' in obj)) {
    errors.push('Envelope is missing status, message, and data fields');
  }
  if (errors.length > 0) {
    return { valid: false, envelope: null, errors };
  }
  return {
    valid: true,
    envelope: {
      status,
      message,
      data: obj.data as T | undefined,
      error: typeof obj.error === 'string' ? obj.error : undefined,
    },
    errors: [],
  };
}

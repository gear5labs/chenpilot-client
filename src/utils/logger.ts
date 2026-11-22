/**
 * Shared logger (#133, #924) — High-cardinality and sensitive data log protection.
 *
 * - Redacts sensitive keys (passwords, tokens, private keys, emails, prompt payloads)
 * - Hashes high-cardinality user inputs into safe correlation IDs
 * - Prevents raw logging of sensitive or unbounded user data
 * - Redacts agent prompt/response content (#273) unless explicitly opted in
 * - Silent in production (NODE_ENV !== 'development')
 */

const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

const SENSITIVE_KEY_REGEX = /(password|token|secret|credential|auth|bearer|privatekey|secretkey|seed|prompttext|rawprompt|email)/i;

// Keys that carry free-form agent conversation content (prompts, replies, memory).
// Matched exactly so metadata keys such as `queryLength` or `dataHash` stay visible.
const CONTENT_KEY_REGEX = /^(query|prompt|response|responsedata|data|content|memory|executiontrace)$/i;

/**
 * Whether raw agent prompt/response content may be logged.
 * Off by default; opt in locally with NEXT_PUBLIC_LOG_AGENT_CONTENT=true. Never enabled in production.
 */
export function isContentLoggingEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_LOG_AGENT_CONTENT === "true"
  );
}

/**
 * Deterministic hash helper to convert high-cardinality user values into safe correlation IDs.
 */
export function hashValue(val: string): string {
  if (!val) return 'empty';
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    const char = val.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `hash_${hex}`;
}

/**
 * Generate a safe correlation ID for request tracing without high-cardinality leaks.
 */
export function generateCorrelationId(prefix = 'corr'): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${rand}`;
}

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Read a correlation ID only from HTTP metadata. Payload bodies are never inspected.
 */
export function extractCorrelationId(headers: unknown): string | undefined {
  if (!headers) return undefined;

  const read = (key: string): unknown => {
    if (typeof headers === 'object') {
      const axiosHeaders = headers as { get?: (name: string) => unknown };
      if (typeof axiosHeaders.get === 'function') {
        const value = axiosHeaders.get(key);
        if (value !== undefined) return value;
      }
      const record = headers as Record<string, unknown>;
      const exact = record[key];
      if (exact !== undefined) return exact;
      const lowerKey = key.toLowerCase();
      const found = Object.entries(record).find(([name]) => name.toLowerCase() === lowerKey);
      return found?.[1];
    }
    return undefined;
  };

  for (const key of [CORRELATION_ID_HEADER, 'X-Request-ID', 'X-Request-Id']) {
    const value = read(key);
    if (typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
      return value;
    }
  }
  return undefined;
}

export function setCorrelationIdHeader(headers: unknown, correlationId: string): void {
  if (!headers || typeof headers !== 'object') return;
  const mutable = headers as {
    set?: (name: string, value: string) => unknown;
  };
  if (typeof mutable.set === 'function') {
    mutable.set(CORRELATION_ID_HEADER, correlationId);
    return;
  }
  (headers as Record<string, unknown>)[CORRELATION_ID_HEADER] = correlationId;
}

export function correlationIdForError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as {
    correlationId?: unknown;
    config?: { headers?: unknown };
    response?: { headers?: unknown };
  };
  if (typeof record.correlationId === 'string') return record.correlationId;
  return (
    extractCorrelationId(record.response?.headers) ??
    extractCorrelationId(record.config?.headers)
  );
}

/**
 * Checks if a string or object key contains sensitive or high-cardinality fields.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_REGEX.test(key.replace(/[-_]/g, ''));
}

/**
 * Checks if a key holds agent conversation content (prompt, response payload, memory).
 */
export function isContentKey(key: string): boolean {
  return CONTENT_KEY_REGEX.test(key.replace(/[-_]/g, ''));
}

/**
 * Describe a content payload by size and hash only, so it can be correlated without being logged.
 */
export function summarizeContent(val: unknown): { length: number; hash: string } {
  let text: string;
  if (typeof val === 'string') {
    text = val;
  } else {
    try {
      text = JSON.stringify(val) ?? '';
    } catch {
      text = String(val);
    }
  }
  return { length: text.length, hash: hashValue(text) };
}

/**
 * Recursively sanitize log objects, redacting sensitive keys and truncating long strings.
 */
export function sanitizeLogValue(val: unknown, depth = 0): unknown {
  if (val === null || val === undefined) return val;
  if (depth > 5) return '[Max Depth Exceeded]';

  if (typeof val === 'string') {
    // Check if string looks like a Bearer token or secret key
    if (val.startsWith('Bearer ') || val.startsWith('S') && val.length === 56) {
      return '[REDACTED_SECRET]';
    }
    // Truncate excessively long strings (e.g. large prompt bodies) to prevent unbounded cardinality
    if (val.length > 120) {
      return `${val.substring(0, 40)}... [truncated, len=${val.length}, ${hashValue(val)}]`;
    }
    return val;
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((item) => sanitizeLogValue(item, depth + 1));
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = typeof value === 'string' ? `[REDACTED, ${hashValue(value)}]` : '[REDACTED]';
      } else if (isContentKey(key) && value !== null && value !== undefined && !isContentLoggingEnabled()) {
        const { length, hash } = summarizeContent(value);
        sanitizedObj[key] = `[REDACTED_CONTENT, len=${length}, ${hash}]`;
      } else {
        sanitizedObj[key] = sanitizeLogValue(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return val;
}

/**
 * Patterns matching server internals, stack traces, database engines, or system socket errors.
 */
export const SERVER_INTERNAL_PATTERNS: RegExp[] = [
  // Stack traces
  /(?:^|\n)\s*at\s+(?:[A-Za-z0-9_$.<>]+\s+\()?.*:\d+:\d+\)?/,
  /\bTraceback\s+\(most recent call last\):/i,
  /\bat\s+[A-Za-z0-9_$./\\-]+\.(?:js|ts|jsx|tsx|py|rb|php|java|go|rs):\d+/i,
  // Filesystem paths & system errors
  /(?:\/home\/|\/var\/|\/app\/|[A-Za-z]:\\Users\\|[A-Za-z]:\\[\w-]+\\)/i,
  /\bnode_modules[\\/]/i,
  /\b(ENOENT|EACCES|EPERM|ENOSPC|EEXIST)\b/i,
  // Database internals
  /\b(syntax error at or near|duplicate key value violates unique constraint|relation ".*" does not exist|column ".*" does not exist|deadlock detected|foreign key constraint|table ".*" doesn't exist)\b/i,
  /\b(PostgresError|MongoError|SequelizeDatabaseError|QueryFailedError|TypeORMError|PrismaClientKnownRequestError)\b/i,
  /\bSQLSTATE\[\w+\]/i,
  /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\s+FROM\s+/i,
  // Network / socket internals
  /\b(ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|EADDRINUSE|EPIPE|EHOSTUNREACH)\b/i,
  /\b(?:127\.0\.0\.1|localhost:\d+|0\.0\.0\.0)\b/i,
  // Unhandled runtime dumps
  /\b(NullPointerException|Segmentation fault|SIGSEGV|panic:|fatal error:)\b/i,
  /\b(?:TypeError|ReferenceError|RangeError): [^\n]+\n\s+at/i,
  // Secrets and tokens
  /\b(sk_live_[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/i,
];

/**
 * Checks if a string contains server internal error traces, stack paths, or database errors.
 */
export function isServerInternalMessage(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  return SERVER_INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitizes and redacts raw error strings, stripping stack traces, internal paths,
 * and database internals to prevent leaking server details to the client UI.
 */
export function redactServerInternals(
  message: string,
  fallback = 'An internal server error occurred. Please try again later.'
): string {
  if (!message || typeof message !== 'string') {
    return fallback;
  }

  // If the message contains server internals, return the safe fallback
  if (isServerInternalMessage(message)) {
    return fallback;
  }

  // Strip bearer tokens or private key patterns if present in message
  if (/Bearer\s+[A-Za-z0-9._~+/-]+=*/i.test(message)) {
    message = message.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
  }
  if (/S[A-Z0-9]{55}/.test(message)) {
    message = message.replace(/S[A-Z0-9]{55}/g, '[REDACTED_SECRET]');
  }

  return message;
}

export function sanitizeLogArgs(args: unknown[]): unknown[] {
  return args.map((arg) => sanitizeLogValue(arg));
}

// Rate limit: at most one identical message per 2 seconds in dev
const recentMessages = new Map<string, number>();
const RATE_LIMIT_MS = 2_000;

function rateLimited(key: string): boolean {
  if (!isDev) return true; // never log in production
  const now = Date.now();
  const last = recentMessages.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) return true;
  recentMessages.set(key, now);
  return false;
}

function format(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : (() => {
      try { return JSON.stringify(a); } catch { return String(a); }
    })()))
    .join(" ");
}

export const logger = {
  info(...args: unknown[]): void {
    const sanitized = sanitizeLogArgs(args);
    if (rateLimited(format(sanitized))) return;
    // eslint-disable-next-line no-console
    console.log("[info]", ...sanitized);
  },
  warn(...args: unknown[]): void {
    const sanitized = sanitizeLogArgs(args);
    if (rateLimited(format(sanitized))) return;
    // eslint-disable-next-line no-console
    console.warn("[warn]", ...sanitized);
  },
  error(...args: unknown[]): void {
    const sanitized = sanitizeLogArgs(args);
    // errors are never rate-limited — they signal real failures
    // eslint-disable-next-line no-console
    console.error("[error]", ...sanitized);
  },
  debug(...args: unknown[]): void {
    if (!isDev) return; // debug only in dev/test
    const sanitized = sanitizeLogArgs(args);
    if (rateLimited(format(sanitized))) return;
    // eslint-disable-next-line no-console
    console.log("[debug]", ...sanitized);
  },
};

export default logger;

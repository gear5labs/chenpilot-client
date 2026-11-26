import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenRefreshResult {
  token: string;
}

interface QueueEntry {
  resolve: (value: TokenRefreshResult) => void;
  reject: (reason: unknown) => void;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Singleton that serialises concurrent token-refresh calls.
 *
 * When a 401 arrives while a refresh is already in-flight every subsequent
 * caller is queued.  Once the refresh resolves (or rejects) all queued callers
 * are settled in one go, so the application only ever sends a single refresh
 * request at a time.
 */
export class TokenRefreshService {
  private static instance: TokenRefreshService;

  /** True while a refresh HTTP call is in-flight. */
  private isRefreshing = false;

  /**
   * Requests that arrived while a refresh was already in-flight.
   * Each entry holds the resolve/reject callbacks of the promise returned
   * to the waiting 401 handler.
   */
  private failedQueue: QueueEntry[] = [];

  // ── Singleton ──────────────────────────────────────────────────────────────

  static getInstance(): TokenRefreshService {
    if (!TokenRefreshService.instance) {
      TokenRefreshService.instance = new TokenRefreshService();
    }
    return TokenRefreshService.instance;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Drain the queue, settling every waiting caller with either the new token
   * result or the refresh error.
   */
  private processQueue(error: unknown, result: TokenRefreshResult | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        // result is guaranteed non-null when error is falsy
        resolve(result!);
      }
    });
    this.failedQueue = [];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Request a new access token.
   *
   * - If no refresh is in-flight, performs the HTTP POST immediately.
   * - If a refresh is already in-flight, queues the caller and returns a
   *   promise that resolves/rejects when the active refresh completes.
   *
   * In both cases the caller receives a `{ token: string }` object on success,
   * matching the return type that the Axios response interceptor expects.
   */
  async refreshToken(apiBaseUrl: string): Promise<TokenRefreshResult> {
    // ── Queue path: a refresh is already running ──────────────────────────
    if (this.isRefreshing) {
      return new Promise<TokenRefreshResult>((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    // ── Active path: we are the first caller ──────────────────────────────
    this.isRefreshing = true;

    try {
      const response = await axios.post<TokenRefreshResult>(
        `${apiBaseUrl}/auth/refresh`,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          // Forward cookies so the server can read the httpOnly refresh-token
          // cookie that it set on login.
          withCredentials: true,
        },
      );

      const result: TokenRefreshResult = { token: response.data.token };

      // Settle every queued caller with the same result object before we
      // return, so they can all retry with the new token in parallel.
      this.processQueue(null, result);

      return result;
    } catch (error) {
      // Propagate the error to every queued caller.
      this.processQueue(error, null);
      throw error;
    } finally {
      // Always reset the flag so subsequent 401s can trigger a fresh refresh.
      this.isRefreshing = false;
    }
  }

  /** Convenience accessor used by tests and diagnostics. */
  isTokenRefreshing(): boolean {
    return this.isRefreshing;
  }

  /** Number of requests currently waiting for the in-flight refresh. */
  queueLength(): number {
    return this.failedQueue.length;
  }
}

export const tokenRefreshService = TokenRefreshService.getInstance();

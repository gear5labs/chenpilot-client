import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  correlationIdForError,
  extractCorrelationId,
  generateCorrelationId,
  logger,
  setCorrelationIdHeader,
} from '../../utils/logger';
import { tokenRefreshService } from '../tokenRefreshService';
import {
  isRetryableError,
  computeBackoffMs,
  sleep,
  incrementRetryCount,
  retryLabel,
} from '@/utils/retryUtils';

export type MinimalStore = {
  dispatch: (action: { type: string; payload?: unknown }) => void;
};

export interface PaymentRequestConfig extends AxiosRequestConfig {
  paymentOperation?: boolean;
}

/**
 * ApiClient manages the underlying Axios instance, token lifecycle,
 * request correlation headers, retry backoff, and 401 token refresh.
 */
export class ApiClient {
  private readonly _api: AxiosInstance;
  private _token: string | null = null;
  private _store: MinimalStore | null = null;

  constructor(baseURL?: string) {
    this.loadTokenFromStorage();

    this._api = axios.create({
      baseURL:
        baseURL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:2333',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Attach current token and correlation ID to outgoing requests.
    this._api.interceptors.request.use(
      (config) => {
        const existingId = extractCorrelationId(config.headers);
        const correlationId = existingId ?? generateCorrelationId('http');
        setCorrelationIdHeader(config.headers, correlationId);
        (config as AxiosRequestConfig & { correlationId?: string }).correlationId =
          correlationId;
        if (this._token) {
          config.headers.Authorization = `Bearer ${this._token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Retry eligible transient failures.
    this._api.interceptors.response.use(
      (response) => {
        const correlationId =
          extractCorrelationId(response.headers) ??
          extractCorrelationId(response.config?.headers);
        if (correlationId) {
          (
            response as typeof response & { correlationId?: string }
          ).correlationId = correlationId;
          setCorrelationIdHeader(response.config?.headers, correlationId);
        }
        return response;
      },
      async (error) => {
        const correlationId = correlationIdForError(error);
        if (correlationId) {
          (error as { correlationId?: string }).correlationId = correlationId;
        }
        const originalRequest = error.config as
          | (AxiosRequestConfig & {
              _retryCount?: number;
              paymentOperation?: boolean;
            })
          | undefined;

        if (!originalRequest || !isRetryableError(error)) {
          return Promise.reject(error);
        }

        if (
          originalRequest.paymentOperation &&
          !originalRequest.headers
        ) {
          return Promise.reject(error);
        }

        const attempt = incrementRetryCount(originalRequest);
        const delayMs = computeBackoffMs(attempt - 1, error);
        const label = retryLabel(error);

        if (this._store) {
          this._store.dispatch({
            type: 'ui/setRetryStatus',
            payload: {
              label,
              attempt,
              maxAttempts: 3,
              nextRetryAt: Date.now() + delayMs,
            },
          });
        }

        await sleep(delayMs);

        if (this._store) {
          this._store.dispatch({ type: 'ui/clearRetryStatus' });
        }

        return this._api(originalRequest);
      },
    );

    // Refresh expired authentication tokens after a 401 response.
    this._api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const correlationId =
          correlationIdForError(error) ??
          generateCorrelationId('http');
        (error as { correlationId?: string }).correlationId = correlationId;
        logger.error('[ApiService] Request failed:', {
          correlationId,
          status: error.response?.status,
          code: error.code,
          method: error.config?.method,
        });

        const originalRequest = error.config as
          | (AxiosRequestConfig & {
              _retry?: boolean;
              headers?: Record<string, unknown> & {
                Authorization?: string;
              };
            })
          | undefined;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        // A step-up challenge is not an expired session (#255, ADR-0006).
        if (error.response?.data?.code === 'REAUTH_REQUIRED') {
          return Promise.reject(error);
        }

        if (
          error.response?.status !== 401 ||
          originalRequest._retry
        ) {
          if (error.response?.status === 401) {
            this.clearToken();

            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }

          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          const { token: newToken } =
            await tokenRefreshService.refreshToken(
              this._api.defaults.baseURL as string,
            );

          this.setToken(newToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          if (this._store) {
            this._store.dispatch({
              type: 'auth/setToken',
              payload: newToken,
            });
          }

          return this._api(originalRequest);
        } catch (refreshError) {
          this.clearToken();

          if (this._store) {
            this._store.dispatch({ type: 'auth/clearAuth' });
          }

          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }

          return Promise.reject(refreshError);
        }
      },
    );
  }

  get api(): AxiosInstance {
    return this._api;
  }

  get token(): string | null {
    return this._token;
  }

  setStore(store: MinimalStore): void {
    this._store = store;
  }

  getStore(): MinimalStore | null {
    return this._store;
  }

  setToken(token: string): void {
    this._token = token;

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken(): void {
    this._token = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  loadTokenFromStorage(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');

      if (token) {
        this._token = token;
      }
    }
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this._api.request<T>(config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

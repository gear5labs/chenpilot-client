import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  apiClient,
  ApiClient,
  authApi,
  walletApi,
  chatApi,
  contactsApi,
  liquidityApi,
  auditApi,
  AuthApi,
  WalletApi,
  ChatApi,
  ContactsApi,
  LiquidityApi,
  AuditApi,
  SingleFlight,
  singleFlight,
  requestAccountFunding,
} from '../api/index';
import apiService, {
  ApiService,
  fetchAccountTrustlines,
  addTrustline,
  removeTrustline,
  getAccountTransactions,
} from '../api';
import authService from '../auth.service';

describe('API Domain Modules and Single Configured Client Architecture (#322)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    apiClient.clearToken();
  });

  describe('Domain Module Extraction and Instantiation', () => {
    it('provides discrete domain API modules and classes', () => {
      expect(authApi).toBeInstanceOf(AuthApi);
      expect(walletApi).toBeInstanceOf(WalletApi);
      expect(chatApi).toBeInstanceOf(ChatApi);
      expect(contactsApi).toBeInstanceOf(ContactsApi);
      expect(liquidityApi).toBeInstanceOf(LiquidityApi);
      expect(auditApi).toBeInstanceOf(AuditApi);
    });

    it('shares the exact same underlying AxiosInstance across domain singletons', () => {
      const sharedClientInstance = apiClient.api;

      // Custom domains constructed with the shared apiClient should use the same Axios instance
      const customAuth = new AuthApi(apiClient);
      const customWallet = new WalletApi(apiClient);
      const customChat = new ChatApi(apiClient);
      const customContacts = new ContactsApi(apiClient);

      expect((customAuth as unknown as { client: ApiClient }).client.api).toBe(sharedClientInstance);
      expect((customWallet as unknown as { client: ApiClient }).client.api).toBe(sharedClientInstance);
      expect((customChat as unknown as { client: ApiClient }).client.api).toBe(sharedClientInstance);
      expect((customContacts as unknown as { client: ApiClient }).client.api).toBe(sharedClientInstance);
    });

    it('exposes domain instances through ApiService for unified access', () => {
      expect(apiService.auth).toBeInstanceOf(AuthApi);
      expect(apiService.wallet).toBeInstanceOf(WalletApi);
      expect(apiService.chat).toBeInstanceOf(ChatApi);
      expect(apiService.contacts).toBeInstanceOf(ContactsApi);
      expect(apiService.liquidity).toBeInstanceOf(LiquidityApi);
      expect(apiService.audit).toBeInstanceOf(AuditApi);
      expect(apiService.api).toBe(apiClient.api);
    });
  });

  describe('Single Configured Client & Shared Auth Token State', () => {
    it('propagates token changes from client to all domain module requests', async () => {
      const getSpy = vi.spyOn(apiClient.api, 'get').mockResolvedValueOnce({
        data: { success: true, data: { address: '0x123', isDeployed: true, balance: '10' } },
      });

      apiClient.setToken('domain-shared-token-xyz');

      // Call wallet domain method
      await walletApi.getAccountStatus();

      expect(getSpy).toHaveBeenCalledTimes(1);
      // Verify request interceptor attached the token
      const interceptors = (apiClient.api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }>;
      }).handlers;

      const requestConfig = { headers: {} };
      const modifiedConfig = interceptors[0].fulfilled(requestConfig);

      expect(modifiedConfig.headers).toHaveProperty('Authorization', 'Bearer domain-shared-token-xyz');
      expect(modifiedConfig.headers).toHaveProperty('X-Correlation-ID');
    });

    it('clears token across all domains when client clears token', () => {
      apiClient.setToken('test-token-to-clear');
      expect(apiClient.token).toBe('test-token-to-clear');

      apiClient.clearToken();
      expect(apiClient.token).toBeNull();

      const interceptors = (apiClient.api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }>;
      }).handlers;

      const requestConfig = { headers: {} };
      const modifiedConfig = interceptors[0].fulfilled(requestConfig);

      expect((modifiedConfig.headers as Record<string, unknown>).Authorization).toBeUndefined();
    });

    it('injects correlation ID header to outgoing requests on the shared client', () => {
      const interceptors = (apiClient.api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }>;
      }).handlers;

      const requestConfig = { headers: {} };
      const modifiedConfig = interceptors[0].fulfilled(requestConfig);

      expect(typeof (modifiedConfig.headers as Record<string, unknown>)['X-Correlation-ID']).toBe('string');
      expect((modifiedConfig.headers as Record<string, string>)['X-Correlation-ID']).toMatch(/^http_/);
    });
  });

  describe('Backward-Compatible Exports Preservation', () => {
    it('preserves all legacy exports and standalone helpers from api.ts', () => {
      expect(apiService).toBeDefined();
      expect(ApiService).toBeDefined();
      expect(singleFlight).toBeInstanceOf(SingleFlight);
      expect(SingleFlight).toBeDefined();
      expect(typeof requestAccountFunding).toBe('function');
      expect(typeof fetchAccountTrustlines).toBe('function');
      expect(typeof addTrustline).toBe('function');
      expect(typeof removeTrustline).toBe('function');
      expect(typeof getAccountTransactions).toBe('function');
    });

    it('delegates standalone helper functions to apiService/domain modules', async () => {
      const trustlineSpy = vi.spyOn(apiService, 'fetchAccountTrustlines').mockResolvedValueOnce([]);
      const transactionsSpy = vi.spyOn(apiService, 'getAccountTransactions').mockResolvedValueOnce({
        success: true,
        data: { transactions: [], total: 0, page: 1, limit: 10 },
      });

      await fetchAccountTrustlines('sample-key');
      expect(trustlineSpy).toHaveBeenCalledWith('sample-key');

      await getAccountTransactions('user-1', 2, 20);
      expect(transactionsSpy).toHaveBeenCalledWith('user-1', 2, 20);
    });

    it('seamlessly works with AuthService while retaining unified client session', () => {
      expect(authService).toBeDefined();
      expect(typeof authService.logout).toBe('function');
      expect(typeof authService.reauthenticate).toBe('function');
      expect(typeof authService.getMfaStatus).toBe('function');
    });
  });
});

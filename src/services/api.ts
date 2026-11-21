import { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  RegisterRequest,
  LoginRequest,
  RegisterResponse,
  LoginResponse,
  User,
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  SendPaymentRequest,
  BalanceResponse,
  AgentQueryRequest,
  AgentQueryResponse,
  ApiResponse,
  SignInActivityPage,
  ChatHistoryPage,
  ChatHistoryQuery,
  PromptVersionRecord,
  LiquidityStats,
  LiquidityRequest,
  StellarTransaction,
  AuditLogEntry,
  AuditLogsQueryParams,
  AuditLogsResponse,
  AuditLogStats,
  MfaStatusData,
  MfaEnrollmentData,
  MfaVerifyRequest,
  MfaVerifyData,
  PaymentSubmissionResult,
  PaymentStatusResult,
} from '@/types';
import type { AgentStatus } from '@/types/agent';
import type { MissedEventsPage } from './socketManager';
import {
  ApiClient,
  apiClient,
  MinimalStore,
  AuthApi,
  WalletApi,
  ChatApi,
  ContactsApi,
  LiquidityApi,
  AuditApi,
  Trustline,
  AddTrustlineRequest,
} from './api/index';

export * from './api/index';

/**
 * Main API service handling HTTP requests, authentication state,
 * error retries, background token refreshes, and domain-specific integrations.
 *
 * Internally decomposes operations across cohesive domain modules (auth, wallet,
 * chat, contacts, liquidity, audit) while retaining a single configured Axios client.
 */
export class ApiService {
  public api: AxiosInstance;
  public auth: AuthApi;
  public wallet: WalletApi;
  public chat: ChatApi;
  public contacts: ContactsApi;
  public liquidity: LiquidityApi;
  public audit: AuditApi;
  private client: ApiClient;

  constructor(client?: ApiClient) {
    this.client = client ?? new ApiClient();
    this.api = this.client.api;
    this.auth = new AuthApi(this.client);
    this.wallet = new WalletApi(this.client);
    this.chat = new ChatApi(this.client);
    this.contacts = new ContactsApi(this.client);
    this.liquidity = new LiquidityApi(this.client);
    this.audit = new AuditApi(this.client);
  }

  setStore(store: MinimalStore): void {
    this.client.setStore(store);
  }

  getStore(): MinimalStore | null {
    return this.client.getStore();
  }

  setToken(token: string): void {
    this.client.setToken(token);
  }

  clearToken(): void {
    this.client.clearToken();
  }

  loadTokenFromStorage(): void {
    this.client.loadTokenFromStorage();
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.client.request<T>(config);
  }

  // Authentication endpoints

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.auth.register(data);
  }

  async reauthenticate(email: string, password: string): Promise<void> {
    return this.auth.reauthenticate(email, password);
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.auth.login(data);
  }

  async googleAuth(token: string): Promise<LoginResponse> {
    return this.auth.googleAuth(token);
  }

  async verifyEmail(
    token: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.auth.verifyEmail(token);
  }

  async resendVerification(
    email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.auth.resendVerification(email);
  }

  async forgotPassword(
    email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.auth.forgotPassword(email);
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.auth.resetPassword(token, password);
  }

  async revokeOtherSessions(): Promise<{ currentSessionRevoked: boolean }> {
    return this.auth.revokeOtherSessions();
  }

  async logout(): Promise<void> {
    return this.auth.logout();
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.auth.refreshToken();
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.auth.getMe();
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.auth.getProfile();
  }

  async updateProfile(
    data: Partial<User>,
  ): Promise<ApiResponse<User>> {
    return this.auth.updateProfile(data);
  }

  async getSignInActivity(limit = 20): Promise<SignInActivityPage> {
    return this.auth.getSignInActivity(limit);
  }

  async revokeSession(sessionId: string): Promise<void> {
    return this.auth.revokeSession(sessionId);
  }

  async reportSignInEvent(eventId: string): Promise<void> {
    return this.auth.reportSignInEvent(eventId);
  }

  async stepUpReauthenticate(password: string): Promise<{ authenticatedAt: string; expiresAt: string }> {
    return this.auth.stepUpReauthenticate(password);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.auth.changePassword(currentPassword, newPassword);
  }

  async exportUserData(): Promise<Blob> {
    return this.auth.exportUserData();
  }

  async getMfaStatus(): Promise<ApiResponse<MfaStatusData>> {
    return this.auth.getMfaStatus();
  }

  async initiateMfaEnrollment(): Promise<
    ApiResponse<MfaEnrollmentData>
  > {
    return this.auth.initiateMfaEnrollment();
  }

  async verifyMfaEnrollment(
    data: MfaVerifyRequest,
  ): Promise<ApiResponse<MfaVerifyData>> {
    return this.auth.verifyMfaEnrollment(data);
  }

  // Wallet and Starknet management

  async deployAccount(): Promise<
    ApiResponse<{
      transactionHash: string;
      contractAddress: string;
    }>
  > {
    return this.wallet.deployAccount();
  }

  async getBalance(): Promise<BalanceResponse> {
    return this.wallet.getBalance();
  }

  async getAccountStatus(): Promise<
    ApiResponse<{
      isDeployed: boolean;
      isFunded: boolean;
      address: string;
      publicKey: string;
    }>
  > {
    return this.wallet.getAccountStatus();
  }

  async fundAccount(): Promise<
    ApiResponse<{ transactionHash: string; amount: string }>
  > {
    return this.wallet.fundAccount();
  }

  async getAutoFundingStats(): Promise<
    ApiResponse<{
      totalFunded: number;
      totalAccounts: number;
      averageAmount: string;
    }>
  > {
    return this.wallet.getAutoFundingStats();
  }

  async getFundedAccountBalance(): Promise<
    ApiResponse<{ balance: string; hasBalance: boolean }>
  > {
    return this.wallet.getFundedAccountBalance();
  }

  async batchFund(
    amounts: string[],
  ): Promise<
    ApiResponse<{
      transactionHashes: string[];
      totalAmount: string;
    }>
  > {
    return this.wallet.batchFund(amounts);
  }

  async getAccountTransactions(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<
    ApiResponse<{
      transactions: StellarTransaction[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return this.wallet.getAccountTransactions(userId, page, limit);
  }

  async sendPayment(
    payment: SendPaymentRequest,
    idempotencyKey: string,
  ): Promise<PaymentSubmissionResult>;

  async sendPayment(
    payment: SendPaymentRequest,
  ): Promise<ApiResponse<{ paymentId: string; status: string }>>;

  async sendPayment(
    payment: SendPaymentRequest,
    suppliedIdempotencyKey?: string,
  ): Promise<
    | PaymentSubmissionResult
    | ApiResponse<{ paymentId: string; status: string }>
  > {
    if (suppliedIdempotencyKey) {
      return this.wallet.sendPayment(payment, suppliedIdempotencyKey);
    }
    return this.wallet.sendPayment(payment);
  }

  async getPaymentStatus(
    idempotencyKey: string,
  ): Promise<PaymentStatusResult> {
    return this.wallet.getPaymentStatus(idempotencyKey);
  }

  async fetchAccountTrustlines(
    publicKey: string,
  ): Promise<Trustline[]> {
    return this.wallet.fetchAccountTrustlines(publicKey);
  }

  async addTrustline(
    publicKey: string,
    data: AddTrustlineRequest,
  ): Promise<ApiResponse<Trustline> | unknown> {
    return this.wallet.addTrustline(publicKey, data);
  }

  async removeTrustline(
    publicKey: string,
    assetCode: string,
    assetIssuer: string,
  ): Promise<ApiResponse<void> | unknown> {
    return this.wallet.removeTrustline(publicKey, assetCode, assetIssuer);
  }

  // Chat & Agent endpoints

  async getMissedChatEvents(afterCursor: string, limit = 100): Promise<MissedEventsPage> {
    return this.chat.getMissedChatEvents(afterCursor, limit);
  }

  async queryAgent(data: AgentQueryRequest): Promise<AgentQueryResponse>;
  async queryAgent(
    data: AgentQueryRequest,
    options?: { onDelta?: (text: string) => void; signal?: AbortSignal },
  ): Promise<AgentQueryResponse>;
  async queryAgent(
    data: AgentQueryRequest,
    options?: { onDelta?: (text: string) => void; signal?: AbortSignal },
  ): Promise<AgentQueryResponse> {
    return this.chat.queryAgent(data, options);
  }

  async getAgentStatus(): Promise<AgentStatus> {
    return this.chat.getAgentStatus();
  }

  async getAgentCapabilities() {
    return this.chat.getAgentCapabilities();
  }

  async checkAgentHealth() {
    return this.chat.checkAgentHealth();
  }

  async getAgentTools() {
    return this.chat.getAgentTools();
  }

  async executeAgentTool(
    toolName: string,
    params: Record<string, unknown>,
  ) {
    return this.chat.executeAgentTool(toolName, params);
  }

  async getAgentMemory(userId: string) {
    return this.chat.getAgentMemory(userId);
  }

  async clearAgentMemory(userId: string): Promise<void> {
    return this.chat.clearAgentMemory(userId);
  }

  async getChatHistory(query: ChatHistoryQuery = {}): Promise<ChatHistoryPage> {
    return this.chat.getChatHistory(query);
  }

  async getConversationStats(): Promise<
    ApiResponse<{
      totalConversations: number;
      totalMessages: number;
      activeConversations: number;
    }>
  > {
    return this.chat.getConversationStats();
  }

  async getPromptVersions(): Promise<
    | PromptVersionRecord[]
    | ApiResponse<PromptVersionRecord[]>
    | PromptVersionRecord
  > {
    return this.chat.getPromptVersions();
  }

  async activatePromptVersion(
    id: string,
  ): Promise<
    ApiResponse<PromptVersionRecord> | PromptVersionRecord
  > {
    return this.chat.activatePromptVersion(id);
  }

  // Contacts endpoints

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    return this.contacts.getContacts();
  }

  async createContact(
    data: CreateContactRequest,
  ): Promise<ApiResponse<Contact>> {
    return this.contacts.createContact(data);
  }

  async updateContact(
    id: string,
    data: UpdateContactRequest,
  ): Promise<ApiResponse<Contact>> {
    return this.contacts.updateContact(id, data);
  }

  async deleteContact(
    id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.contacts.deleteContact(id);
  }

  // Liquidity endpoints

  async getLiquidityStats(
    request?: LiquidityRequest,
  ): Promise<ApiResponse<LiquidityStats>> {
    return this.liquidity.getLiquidityStats(request);
  }

  // Audit log endpoints

  async getAuditLogs(
    params: AuditLogsQueryParams = {},
  ): Promise<AuditLogsResponse> {
    return this.audit.getAuditLogs(params);
  }

  async getAuditLogById(
    id: string,
  ): Promise<ApiResponse<AuditLogEntry>> {
    return this.audit.getAuditLogById(id);
  }

  async getAuditLogStats(): Promise<
    ApiResponse<AuditLogStats>
  > {
    return this.audit.getAuditLogStats();
  }

  async exportAuditLogs(
    params: AuditLogsQueryParams = {},
  ): Promise<Blob> {
    return this.audit.exportAuditLogs(params);
  }
}

// Singleton instances

export const apiService = new ApiService(apiClient);
export default apiService;

// Standalone trustline helpers

export const fetchAccountTrustlines = (
  publicKey: string,
): Promise<Trustline[]> =>
  apiService.fetchAccountTrustlines(publicKey);

export const addTrustline = (
  publicKey: string,
  data: AddTrustlineRequest,
): Promise<ApiResponse<Trustline> | unknown> =>
  apiService.addTrustline(publicKey, data);

export const removeTrustline = (
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
): Promise<ApiResponse<void> | unknown> =>
  apiService.removeTrustline(publicKey, assetCode, assetIssuer);

export const getAccountTransactions = (
  userId: string,
  page = 1,
  limit = 10,
) => apiService.getAccountTransactions(userId, page, limit);

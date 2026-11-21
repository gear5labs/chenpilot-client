import axios from 'axios';
import { ApiClient, apiClient } from './client';
import {
  RegisterRequest,
  LoginRequest,
  RegisterResponse,
  LoginResponse,
  User,
  ApiResponse,
  SignInActivityPage,
  MfaStatusData,
  MfaEnrollmentData,
  MfaVerifyRequest,
  MfaVerifyData,
} from '@/types';
import { clearUserScopedStorage } from '../storageInventory';

const isAxiosLike = (error: unknown): error is { response?: { status?: number } } =>
  axios.isAxiosError(error) || (typeof error === 'object' && error !== null && 'response' in error);

export class AuthApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid registration data');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    if (!data.password || typeof data.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }

    if (data.name && typeof data.name !== 'string') {
      throw new Error('Name must be a string if provided');
    }

    const response = await this.client.api.post<RegisterResponse>(
      '/auth/register',
      data,
    );

    const registrationData = response.data as RegisterResponse & {
      data?: { token?: string };
    };

    if (
      registrationData.success &&
      registrationData.data?.token
    ) {
      this.client.setToken(registrationData.data.token);
    }

    return response.data;
  }

  /**
   * Verify current credentials without changing the active session token.
   */
  async reauthenticate(email: string, password: string): Promise<void> {
    const response = await axios.post<LoginResponse>(
      this.client.api.getUri({ url: '/auth/login' }),
      { email, password },
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Re-authentication failed');
    }
  }

  /**
   * Authenticate a user using email and password.
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid login data');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    if (!data.password || typeof data.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }

    const response = await this.client.api.post<LoginResponse>(
      '/auth/login',
      data,
    );

    if (response.data.success && response.data.data.token) {
      this.client.setToken(response.data.data.token);
    }

    return response.data;
  }

  async googleAuth(token: string): Promise<LoginResponse> {
    const response = await this.client.api.post<LoginResponse>(
      '/auth/google-auth',
      { token },
    );

    if (response.data.success && response.data.data.token) {
      this.client.setToken(response.data.data.token);
    }

    return response.data;
  }

  async verifyEmail(
    token: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.api.get<
      ApiResponse<{ message: string }>
    >(`/auth/verify-email/${encodeURIComponent(token)}`);

    return response.data;
  }

  async resendVerification(
    email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.api.post<
      ApiResponse<{ message: string }>
    >('/auth/resend-verification', { email });

    return response.data;
  }

  async forgotPassword(
    email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.api.post<
      ApiResponse<{ message: string }>
    >('/auth/forgot-password', { email });

    return response.data;
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.api.post<
      ApiResponse<{ message: string }>
    >(`/auth/reset-password/${encodeURIComponent(token)}`, {
      password,
    });

    return response.data;
  }

  async revokeOtherSessions(): Promise<{ currentSessionRevoked: boolean }> {
    const token = this.client.token;
    const response = await axios.post<
      ApiResponse<{ currentSessionRevoked?: boolean }> | { currentSessionRevoked?: boolean }
    >(
      `${this.client.api.defaults.baseURL}/auth/sessions/revoke-others`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      },
    );
    const payload = response.data;
    const currentSessionRevoked =
      'data' in payload && payload.data
        ? payload.data.currentSessionRevoked
        : 'currentSessionRevoked' in payload
          ? payload.currentSessionRevoked
          : false;
    return { currentSessionRevoked: currentSessionRevoked === true };
  }

  /**
   * Logout user by invalidating backend session and purging all local auth state.
   */
  async logout(): Promise<void> {
    try {
      await this.client.api.post(
        '/auth/logout',
        {},
        { withCredentials: true },
      );
    } catch (error) {
      console.warn(
        'Logout request failed; clearing local state anyway.',
        error,
      );
    } finally {
      this.client.clearToken();
      clearUserScopedStorage();
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    const response = await axios.post<{ token: string }>(
      `${this.client.api.defaults.baseURL}/auth/refresh`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      },
    );

    if (response.data?.token) {
      this.client.setToken(response.data.token);
    }

    return response.data;
  }

  async getMe(): Promise<ApiResponse<User>> {
    const response = await this.client.api.get<ApiResponse<User>>(
      '/auth/me',
    );

    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.api.get<ApiResponse<User>>(
      '/auth/profile',
    );

    return response.data;
  }

  async updateProfile(
    data: Partial<User>,
  ): Promise<ApiResponse<User>> {
    const response = await this.client.api.put<ApiResponse<User>>(
      '/auth/profile',
      data,
    );

    return response.data;
  }

  async getSignInActivity(limit = 20): Promise<SignInActivityPage> {
    const response = await this.client.api.get<SignInActivityPage>('/auth/activity', { params: { limit } });
    return response.data;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.client.api.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
  }

  async reportSignInEvent(eventId: string): Promise<void> {
    await this.client.api.post(`/auth/activity/${encodeURIComponent(eventId)}/report`, {});
  }

  async stepUpReauthenticate(password: string): Promise<{ authenticatedAt: string; expiresAt: string }> {
    const response = await this.client.api.post<{ authenticatedAt: string; expiresAt: string }>(
      '/auth/reauthenticate',
      { password },
      { withCredentials: true },
    );
    return response.data;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.api.post<
      ApiResponse<{ message: string }>
    >('/auth/change-password', {
      currentPassword,
      newPassword,
    });

    return response.data;
  }

  async exportUserData(): Promise<Blob> {
    const endpoints = [
      '/data-export',
      '/data/export',
      '/api/data-export',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.client.api.get<Blob>(endpoint, {
          responseType: 'blob',
        });

        if (response.status === 200 && response.data) {
          return response.data;
        }
      } catch (error: unknown) {
        if (isAxiosLike(error) && error.response?.status === 404) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('User data export endpoint not found.');
  }

  async getMfaStatus(): Promise<ApiResponse<MfaStatusData>> {
    try {
      const response = await this.client.api.get<ApiResponse<MfaStatusData>>(
        '/auth/mfa/status',
      );

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'MFA endpoints are not currently supported by the backend service',
        };
      }

      throw error;
    }
  }

  async initiateMfaEnrollment(): Promise<
    ApiResponse<MfaEnrollmentData>
  > {
    try {
      const response = await this.client.api.post<
        ApiResponse<MfaEnrollmentData>
      >('/auth/mfa/enroll');

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'MFA enrollment is not currently supported by the backend service',
        };
      }

      throw error;
    }
  }

  async verifyMfaEnrollment(
    data: MfaVerifyRequest,
  ): Promise<ApiResponse<MfaVerifyData>> {
    try {
      const response = await this.client.api.post<
        ApiResponse<MfaVerifyData>
      >('/auth/mfa/verify', data);

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'MFA verification is not currently supported by the backend service',
        };
      }

      throw error;
    }
  }
}

export const authApi = new AuthApi();

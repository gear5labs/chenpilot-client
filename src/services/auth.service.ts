import apiService from './api';

/**
 * Service for handling authentication-related tasks beyond basic API calls.
 */
class AuthService {
  /**
   * Performs a logout by invalidating the session on the backend and
   * clearing all local authentication state.
   */
  async logout(): Promise<void> {
    try {
      // Call the API service to perform the backend logout
      await apiService.logout();
    } catch (error) {
      console.error('AuthService.logout failed:', error);
      // We don't throw here because we want the frontend to proceed
      // with local cleanup regardless of server success.
    }
  }

  /**
   * Checks if the user is currently authenticated locally.
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Gets the stored access token.
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Gets the stored user data.
   */
  getUserData(): any | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
  }
}

export const authService = new AuthService();
export default authService;

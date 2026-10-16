// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, dispatch } = vi.hoisted(() => ({
  state: { auth: { user: { id: 'banner-test-user', email: 'test@example.com', isEmailVerified: false } } },
  dispatch: vi.fn(() => ({ unwrap: () => Promise.resolve({ message: 'sent' }) })),
}));

vi.mock('@/store', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (value: typeof state) => unknown) => selector(state),
}));
vi.mock('@/store/slices/authSlice', () => ({
  fetchProfile: () => ({ type: 'auth/fetchProfile' }),
  resendVerification: (email: string) => ({ type: 'auth/resendVerification', payload: email }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { EmailVerificationBanner } from './EmailVerificationBanner';

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.user = { id: `banner-test-${Math.random()}`, email: 'test@example.com', isEmailVerified: false };
  });

  it('appears only when the signed-in user is unverified', () => {
    const { rerender } = render(React.createElement(EmailVerificationBanner));
    expect(screen.getByRole('status').textContent).toContain('verify your email');
    state.auth.user = { ...state.auth.user, isEmailVerified: true };
    rerender(React.createElement(EmailVerificationBanner));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('disables resend during the 60-second cooldown and unlocks afterwards', async () => {
    vi.useFakeTimers();
    render(React.createElement(EmailVerificationBanner));
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));
    await act(async () => Promise.resolve());
    expect(screen.getByRole('button', { name: 'Resend in 60s' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole('button', { name: 'Resend email' }).hasAttribute('disabled')).toBe(false);
    vi.useRealTimers();
  });

  it('dismisses for the current page session', () => {
    render(React.createElement(EmailVerificationBanner));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss verification notice for this session' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

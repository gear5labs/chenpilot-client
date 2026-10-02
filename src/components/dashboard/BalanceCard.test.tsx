// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BalanceCard } from './BalanceCard';

const balance = { hasBalance: true, balance: '25.5', required: '1', nativeBalance: '25.5' };

describe('BalanceCard', () => {
  it('shows a skeleton until the first balance arrives', () => {
    const { rerender } = render(React.createElement(BalanceCard, {
      balance: null, isLoading: true, isRefreshing: false, lastUpdated: null, error: null, onRefresh: vi.fn(),
    }));
    expect(screen.getByLabelText('Loading balance')).toBeTruthy();
    rerender(React.createElement(BalanceCard, {
      balance, isLoading: false, isRefreshing: false, lastUpdated: null, error: null, onRefresh: vi.fn(),
    }));
    expect(screen.getByText('25.5 XLM')).toBeTruthy();
  });

  it('keeps the last value visible and warns when a refresh fails', () => {
    render(React.createElement(BalanceCard, {
      balance, isLoading: false, isRefreshing: false, lastUpdated: '2026-09-30T10:00:00Z', error: 'Offline', onRefresh: vi.fn(),
    }));
    expect(screen.getByText('25.5 XLM')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('last known balance');
  });

  it('requests a refresh and immediately disables the button during its debounce window', () => {
    const onRefresh = vi.fn();
    render(React.createElement(BalanceCard, {
      balance, isLoading: false, isRefreshing: false, lastUpdated: null, error: null, onRefresh,
    }));
    const button = screen.getByRole('button', { name: 'Refresh balance' });
    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});

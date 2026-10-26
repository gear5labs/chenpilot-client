import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineQueue } from '../useOfflineQueue';

describe('useOfflineQueue - Offline Action Classification and Duplicate Replay Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should classify and queue explicitly supported non-payment actions by default', () => {
    const { result } = renderHook(() => useOfflineQueue());
    act(() => {
      const success = result.current.enqueueAction({ id: 'test-sup-1', type: 'sync_profile', payload: {} });
      expect(success).toBe(true);
    });
    expect(result.current.queue.length).toBe(1);
    expect(result.current.queue[0].type).toBe('sync_profile');
  });

  it('should exclude payment and signing actions by default', () => {
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.isSupportedAction('send_payment')).toBe(false);
    expect(result.current.isSupportedAction('sign_transaction')).toBe(false);
    expect(result.current.isSupportedAction('transfer')).toBe(false);
    expect(result.current.isSupportedAction('sign')).toBe(false);
    expect(result.current.isSupportedAction('sync_profile')).toBe(true);

    act(() => {
      const successPayment = result.current.enqueueAction({ id: 'pay-1', type: 'send_payment', payload: {} });
      const successSign = result.current.enqueueAction({ id: 'sign-1', type: 'sign_transaction', payload: {} });
      expect(successPayment).toBe(false);
      expect(successSign).toBe(false);
    });
    expect(result.current.queue.length).toBe(0);
  });

  it('should prevent duplicate replay protection', () => {
    const { result } = renderHook(() => useOfflineQueue());
    act(() => {
      result.current.enqueueAction({ id: 'test-1', type: 'sync_profile', payload: {} });
      result.current.enqueueAction({ id: 'test-1', type: 'sync_profile', payload: {} });
    });
    expect(result.current.queue.length).toBe(1);
  });
});


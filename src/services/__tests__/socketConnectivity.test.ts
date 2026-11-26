import { describe, expect, it, vi } from 'vitest';
import {
  SocketReconnectGate,
  connectivityAction,
  shouldAttemptReconnect,
} from '../socketConnectivity';

describe('offline-aware socket reconnect (#539)', () => {
  it('never attempts a reconnect while offline', () => {
    expect(shouldAttemptReconnect(false)).toBe(false);
    expect(shouldAttemptReconnect(true)).toBe(true);
    expect(connectivityAction(true, false)).toBe('pause');
    expect(connectivityAction(false, true)).toBe('resume-once');
    expect(connectivityAction(true, true)).toBe('none');
  });

  it('stops queued attempts on an offline transition', () => {
    const onPause = vi.fn();
    const gate = new SocketReconnectGate({ onPause, isOnline: () => false });

    gate.handleOnline();
    expect(gate.hasPendingAttempt).toBe(true);
    gate.handleOffline();

    expect(onPause).toHaveBeenCalledTimes(1);
    expect(gate.isOnline).toBe(false);
    expect(gate.hasPendingAttempt).toBe(false);
    expect(gate.takeAttempt()).toBe(false);
  });

  it('triggers exactly one reconnect attempt when connectivity returns', () => {
    const gate = new SocketReconnectGate({ isOnline: () => false });
    gate.handleOnline();

    expect(gate.takeAttempt()).toBe(true);
    expect(gate.takeAttempt()).toBe(false);
  });

  it('does not stack attempts when online events repeat', () => {
    const onResumeScheduled = vi.fn();
    const gate = new SocketReconnectGate({ onResumeScheduled, isOnline: () => false });

    gate.handleOnline();
    gate.handleOnline();
    gate.handleOnline();

    expect(onResumeScheduled).toHaveBeenCalledTimes(1);
    expect(gate.takeAttempt()).toBe(true);
    expect(gate.takeAttempt()).toBe(false);
  });

  it('requires a real offline → online transition before resuming', () => {
    const gate = new SocketReconnectGate({ isOnline: () => true });

    expect(gate.takeAttempt()).toBe(false);
    gate.handleOnline();
    expect(gate.hasPendingAttempt).toBe(false);
  });

  it('drops a queued attempt once the attempt settles', () => {
    const gate = new SocketReconnectGate({ isOnline: () => false });
    gate.handleOnline();
    gate.attemptSettled();

    expect(gate.takeAttempt()).toBe(false);
  });
});

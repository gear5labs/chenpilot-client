// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketProvider, useSocket } from './SocketProvider';

const { manager } = vi.hoisted(() => ({
  manager: {
    connect: vi.fn(() => ({ connected: false })),
    disconnect: vi.fn(),
    retry: vi.fn(() => ({ connected: false })),
    getSocket: vi.fn(() => null),
    onStateChange: vi.fn((listener: (state: string, attempt: number) => void) => {
      listener('idle', 0);
      return () => {};
    }),
    getMaxReconnectAttempts: vi.fn(() => 5),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  },
}));

vi.mock('@/services/socketManager', () => ({
  SocketManager: class {},
  initializeSocketManager: () => manager,
}));

// Upstream `src/types/socket.ts` has a duplicate declaration that cannot be
// transformed; supply the two values SocketProvider needs for this contract test.
vi.mock('@/types/socket', () => ({
  INITIAL_SOCKET_CONNECTION_STATE: 'idle',
  isSocketConnected: (state: string) => state === 'connected',
}));

function Consumer() {
  const { connectionState } = useSocket();
  return <span data-testid="socket-state">{connectionState}</span>;
}

function renderProvider() {
  return render(
    <SocketProvider config={{ url: 'http://socket.test' }}>
      <Consumer />
    </SocketProvider>,
  );
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

function emitConnectivity(event: 'online' | 'offline') {
  act(() => {
    window.dispatchEvent(new Event(event));
  });
}

describe('SocketProvider offline reconnect gating (#539)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnline(true);
  });

  it('stops automatic attempts on an offline transition', () => {
    renderProvider();
    vi.clearAllMocks();

    setOnline(false);
    emitConnectivity('offline');

    expect(manager.disconnect).toHaveBeenCalledTimes(1);
    expect(manager.retry).not.toHaveBeenCalled();
  });

  it('resumes with exactly one attempt when connectivity returns', () => {
    renderProvider();
    vi.clearAllMocks();

    setOnline(false);
    emitConnectivity('offline');
    setOnline(true);
    emitConnectivity('online');
    emitConnectivity('online');
    emitConnectivity('online');

    expect(manager.retry).toHaveBeenCalledTimes(1);
  });

  it('does not resume while the browser was already online', () => {
    renderProvider();
    vi.clearAllMocks();

    emitConnectivity('online');
    emitConnectivity('online');

    expect(manager.retry).not.toHaveBeenCalled();
    expect(manager.disconnect).not.toHaveBeenCalled();
  });

  it('allows one attempt per genuine reconnect cycle without stacking', () => {
    renderProvider();
    vi.clearAllMocks();

    setOnline(false);
    emitConnectivity('offline');
    setOnline(true);
    emitConnectivity('online');
    emitConnectivity('online');
    expect(manager.retry).toHaveBeenCalledTimes(1);

    setOnline(false);
    emitConnectivity('offline');
    setOnline(true);
    emitConnectivity('online');

    expect(manager.retry).toHaveBeenCalledTimes(2);
  });

  it('exposes the manager-reported state through the provider', () => {
    renderProvider();
    expect(screen.getByTestId('socket-state').textContent).toBe('idle');
  });
});

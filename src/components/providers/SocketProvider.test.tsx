// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import type { SocketConnectionState } from '@/types/socket';
import { SocketProvider, useSocket } from './SocketProvider';

type StateListener = (state: SocketConnectionState, attempt: number) => void;
type EventCallback = (...args: unknown[]) => void;
type Registered = { callback: EventCallback; once: boolean };

const { manager, listeners, registry, fireEvent } = vi.hoisted(() => {
  const listeners: StateListener[] = [];
  const registry = new Map<string, Registered[]>();

  const add = (event: string, callback: EventCallback, once = false) => {
    const entries = registry.get(event) ?? [];
    if (!entries.some((entry) => entry.callback === callback)) {
      entries.push({ callback, once });
    }
    registry.set(event, entries);
  };

  const remove = (event: string, callback?: EventCallback) => {
    if (!callback) {
      registry.delete(event);
      return;
    }
    registry.set(
      event,
      (registry.get(event) ?? []).filter((entry) => entry.callback !== callback),
    );
  };

  const fireEvent = (event: string, ...args: unknown[]) => {
    for (const entry of [...(registry.get(event) ?? [])]) {
      if (entry.once) remove(event, entry.callback);
      entry.callback(...args);
    }
  };

  return {
    listeners,
    registry,
    fireEvent,
    manager: {
      onStateChange: vi.fn((listener: StateListener) => {
        listeners.push(listener);
        return () => {
          listeners.splice(listeners.indexOf(listener), 1);
        };
      }),
      connect: vi.fn(() => ({ connected: false })),
      disconnect: vi.fn(),
      retry: vi.fn(),
      getSocket: vi.fn(() => null),
      getMaxReconnectAttempts: vi.fn(() => 5),
      emit: vi.fn(),
      on: vi.fn((event: string, callback: EventCallback) => add(event, callback)),
      off: vi.fn((event: string, callback?: EventCallback) => remove(event, callback)),
      once: vi.fn((event: string, callback: EventCallback) => add(event, callback, true)),
    },
  };
});

vi.mock('@/services/socketManager', () => ({
  initializeSocketManager: () => manager,
}));

const config = { url: 'http://localhost:3001' };

function StateProbe() {
  const {
    connectionState,
    isConnected,
    reconnectAttempt,
    maxReconnectAttempts,
    isRetrying,
    lastRetryResult,
    retry,
  } = useSocket();
  return (
    <div>
      <p data-testid="probe">
        {connectionState}|{String(isConnected)}|{reconnectAttempt}|{maxReconnectAttempts}
      </p>
      <p data-testid="retry-probe">
        {String(isRetrying)}|{lastRetryResult ?? 'none'}
      </p>
      <button type="button" onClick={retry}>
        Trigger Retry
      </button>
    </div>
  );
}

function ListenerProbe({
  callback,
  event = 'chat:message',
}: {
  callback: EventCallback;
  event?: string;
}) {
  const { on, off, once } = useSocket();
  useEffect(() => {
    on(event, callback);
    once(`${event}:once`, callback);
    return () => off(event, callback);
  }, [event, callback, on, off, once]);
  return null;
}

function emit(state: SocketConnectionState, attempt = 0) {
  act(() => {
    for (const listener of [...listeners]) listener(state, attempt);
  });
}

const probe = () => screen.getByTestId('probe').textContent;
const registrations = (event: string) => registry.get(event) ?? [];

describe('SocketProvider connection state', () => {
  beforeEach(() => {
    listeners.length = 0;
    registry.clear();
    vi.clearAllMocks();
  });

  it('exposes the unknown (idle) state before any transition', () => {
    render(
      <SocketProvider config={config} autoConnect={false}>
        <StateProbe />
      </SocketProvider>,
    );
    expect(probe()).toBe('idle|false|0|5');
  });

  it('follows the manager through connect, reconnect, failure and disconnect', () => {
    render(
      <SocketProvider config={config}>
        <StateProbe />
      </SocketProvider>,
    );

    emit('connecting');
    expect(probe()).toBe('connecting|false|0|5');

    emit('connected');
    expect(probe()).toBe('connected|true|0|5');

    emit('reconnecting', 2);
    expect(probe()).toBe('reconnecting|false|2|5');

    emit('exhausted', 5);
    expect(probe()).toBe('exhausted|false|5|5');

    emit('connecting', 0);
    emit('connected', 0);
    expect(probe()).toBe('connected|true|0|5');

    emit('disconnected');
    expect(probe()).toBe('disconnected|false|0|5');
  });

  it('derives isConnected from the state alone', () => {
    render(
      <SocketProvider config={config}>
        <StateProbe />
      </SocketProvider>,
    );
    emit('connected');
    expect(probe()?.split('|')[1]).toBe('true');
    emit('reconnecting', 1);
    expect(probe()?.split('|')[1]).toBe('false');
  });

  it('unsubscribes from state changes on unmount', () => {
    const view = render(
      <SocketProvider config={config}>
        <StateProbe />
      </SocketProvider>,
    );
    expect(listeners).toHaveLength(1);
    view.unmount();
    expect(listeners).toHaveLength(0);
    expect(manager.disconnect).toHaveBeenCalled();
  });

  it('does not rebind on a new config object without configKey', () => {
    const view = render(
      <SocketProvider config={{ ...config }}>
        <StateProbe />
      </SocketProvider>,
    );
    expect(manager.onStateChange).toHaveBeenCalledTimes(1);
    view.rerender(
      <SocketProvider config={{ ...config }}>
        <StateProbe />
      </SocketProvider>,
    );
    expect(manager.onStateChange).toHaveBeenCalledTimes(1);
  });

  describe('manual reconnect control (#286)', () => {
    const retryProbe = () => screen.getByTestId('retry-probe').textContent;

    it('exposes retry from disconnected and exhausted states and announces success', () => {
      render(
        <SocketProvider config={config}>
          <StateProbe />
        </SocketProvider>,
      );

      emit('disconnected');
      expect(retryProbe()).toBe('false|none');

      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });

      expect(manager.retry).toHaveBeenCalledTimes(1);
      expect(retryProbe()).toBe('true|none');

      emit('connecting');
      emit('connected');
      expect(retryProbe()).toBe('false|succeeded');
    });

    it('prevents concurrent retry calls while a reconnect is already in flight or active', () => {
      render(
        <SocketProvider config={config}>
          <StateProbe />
        </SocketProvider>,
      );

      emit('exhausted', 5);

      act(() => {
        const button = screen.getByRole('button', { name: 'Trigger Retry' });
        button.click();
        button.click();
        button.click();
      });

      expect(manager.retry).toHaveBeenCalledTimes(1);

      // Also ignored while connecting, reconnecting, or connected
      emit('connecting');
      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });
      emit('reconnecting', 1);
      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });
      emit('connected');
      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });

      expect(manager.retry).toHaveBeenCalledTimes(1);
    });

    it('reports failed result when manual retry exhausts again and permits a follow-up retry', () => {
      render(
        <SocketProvider config={config}>
          <StateProbe />
        </SocketProvider>,
      );

      emit('exhausted', 5);
      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });
      expect(manager.retry).toHaveBeenCalledTimes(1);

      emit('connecting');
      emit('exhausted', 5);
      expect(retryProbe()).toBe('false|failed');

      // Follow-up retry is allowed once the previous attempt has settled
      act(() => {
        screen.getByRole('button', { name: 'Trigger Retry' }).click();
      });
      expect(manager.retry).toHaveBeenCalledTimes(2);
      expect(retryProbe()).toBe('true|none');
    });
  });
});

describe('#541 — provider listener cleanup', () => {
  beforeEach(() => {
    listeners.length = 0;
    registry.clear();
    vi.clearAllMocks();
  });

  it('removes registered handlers on unmount so late events are ignored', () => {
    const callback = vi.fn();
    const view = render(
      <SocketProvider config={config}>
        <ListenerProbe callback={callback} />
      </SocketProvider>,
    );

    expect(registrations('chat:message')).toHaveLength(1);
    expect(registrations('chat:message:once')).toHaveLength(1);
    act(() => {
      fireEvent('chat:message', { id: 1 });
      fireEvent('chat:message:once', { id: 1 });
    });
    expect(callback).toHaveBeenCalledTimes(2); // one on(), one once()

    view.unmount();
    expect(manager.off).toHaveBeenCalledWith('chat:message', callback);
    expect(manager.off).toHaveBeenCalledWith('chat:message:once', callback);
    expect(registrations('chat:message')).toHaveLength(0);
    expect(registrations('chat:message:once')).toHaveLength(0);

    act(() => {
      fireEvent('chat:message', { id: 2 });
      fireEvent('chat:message:once', { id: 2 });
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not multiply callbacks across repeated mount/unmount cycles', () => {
    const callback = vi.fn();

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const view = render(
        <SocketProvider config={config}>
          <ListenerProbe callback={callback} />
        </SocketProvider>,
      );
      expect(registrations('chat:message')).toHaveLength(1);
      act(() => {
        fireEvent('chat:message', cycle);
        fireEvent('chat:message:once', cycle);
      });
      view.unmount();
      expect(registrations('chat:message')).toHaveLength(0);
      expect(registrations('chat:message:once')).toHaveLength(0);
    }

    // One invocation per cycle from on() and one from once(), never duplicated.
    expect(callback).toHaveBeenCalledTimes(6);
  });

  it('off(event, handler) removes only that handler and forgets it on cleanup', () => {
    const kept = vi.fn();
    const removed = vi.fn();
    const view = render(
      <SocketProvider config={config}>
        <ListenerProbe callback={kept} />
        <ListenerProbe callback={removed} />
        <OffProbe callback={removed} />
      </SocketProvider>,
    );

    // OffProbe removed the `removed` handler; only `kept` remains registered.
    expect(registrations('chat:message')).toHaveLength(1);
    expect(registrations('chat:message:once')).toHaveLength(1);
    act(() => {
      fireEvent('chat:message', 'before');
      fireEvent('chat:message:once', 'before');
    });
    expect(kept).toHaveBeenCalledTimes(2);
    expect(removed).toHaveBeenCalledTimes(0);

    view.unmount();
    expect(registrations('chat:message')).toHaveLength(0);
    expect(registrations('chat:message:once')).toHaveLength(0);
  });
});

function OffProbe({ callback }: { callback: EventCallback }) {
  const { off } = useSocket();
  useEffect(() => {
    off('chat:message', callback);
    off('chat:message:once', callback);
  }, [callback, off]);
  return null;
}

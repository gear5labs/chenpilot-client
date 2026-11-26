// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ServiceWorkerUpdatePrompt,
  UPDATE_CONFIRMATION,
  type ServiceWorkerUpdatePromptProps,
} from './ServiceWorkerUpdatePrompt';

const { worker, registration, workerListeners, registrationListeners, register, confirmReload, reload } = vi.hoisted(() => {
  type Listener = () => void;
  const workerListeners: Listener[] = [];
  const registrationListeners: Listener[] = [];
  const worker = {
    state: 'installing',
    postMessage: vi.fn(),
    addEventListener: (_type: string, listener: Listener) => workerListeners.push(listener),
    removeEventListener: (_type: string, listener: Listener) => {
      workerListeners.splice(workerListeners.indexOf(listener), 1);
    },
    emitStateChange: () => [...workerListeners].forEach((listener) => listener()),
  };
  const registration = {
    installing: worker,
    waiting: worker,
    addEventListener: (_type: string, listener: Listener) => registrationListeners.push(listener),
    removeEventListener: (_type: string, listener: Listener) => {
      registrationListeners.splice(registrationListeners.indexOf(listener), 1);
    },
    emitUpdateFound: () => [...registrationListeners].forEach((listener) => listener()),
  };
  return {
    worker,
    registration,
    workerListeners,
    registrationListeners,
    register: vi.fn(() => Promise.resolve(registration)),
    confirmReload: vi.fn(() => true),
    reload: vi.fn(),
  };
});

async function renderPrompt(props: Partial<ServiceWorkerUpdatePromptProps> = {}) {
  const view = render(
    <ServiceWorkerUpdatePrompt
      register={register}
      hasController={() => true}
      confirmReload={confirmReload}
      reload={reload}
      {...props}
    />,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

function installUpdate() {
  act(() => {
    registration.emitUpdateFound();
  });
  worker.state = 'installed';
  act(() => {
    worker.emitStateChange();
  });
}

describe('service worker update prompt (#552)', () => {
  beforeEach(() => {
    worker.state = 'installing';
    worker.postMessage.mockClear();
    register.mockClear();
    confirmReload.mockClear();
    confirmReload.mockReturnValue(true);
    reload.mockClear();
    workerListeners.length = 0;
    registrationListeners.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('does not prompt until the new worker has installed', async () => {
    await renderPrompt();

    expect(screen.queryByText('A new version is ready.')).toBeNull();
    act(() => {
      registration.emitUpdateFound();
    });
    expect(screen.queryByText('A new version is ready.')).toBeNull();

    worker.state = 'installed';
    act(() => {
      worker.emitStateChange();
    });
    expect(screen.getByText('A new version is ready.')).toBeDefined();
  });

  it('does not reload before the user confirms', async () => {
    await renderPrompt();
    installUpdate();

    expect(reload).not.toHaveBeenCalled();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('does not interrupt an active wallet transaction', async () => {
    await renderPrompt({ isTransactionActive: () => true });
    installUpdate();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh to update' }));

    expect(screen.getByTestId('service-worker-update-blocked').textContent).toContain(
      'wallet transaction is in progress',
    );
    expect(confirmReload).not.toHaveBeenCalled();
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps the current page when confirmation is declined', async () => {
    confirmReload.mockReturnValue(false);
    await renderPrompt();
    installUpdate();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh to update' }));

    expect(confirmReload).toHaveBeenCalledWith(UPDATE_CONFIRMATION);
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads exactly once after confirmation', async () => {
    await renderPrompt();
    installUpdate();

    const button = screen.getByRole('button', { name: 'Refresh to update' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

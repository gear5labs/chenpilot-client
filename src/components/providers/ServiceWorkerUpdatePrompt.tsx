'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Minimal shapes so the update policy can be tested without a real browser SW. */
export interface UpdateWorker {
  state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
  removeEventListener(type: 'statechange', listener: () => void): void;
}

export interface UpdateRegistration {
  installing: UpdateWorker | null;
  waiting: UpdateWorker | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
  removeEventListener(type: 'updatefound', listener: () => void): void;
}

export interface ServiceWorkerUpdatePromptProps {
  /** Defaults to registering the production service worker. */
  register?: (url: string, options: { type: 'module' }) => Promise<UpdateRegistration>;
  /** Defaults to looking for `[data-active-wallet-transaction="true"]`. */
  isTransactionActive?: () => boolean;
  /** Defaults to `window.confirm`. */
  confirmReload?: (message: string) => boolean;
  /** Defaults to `window.location.reload`. */
  reload?: () => void;
  hasController?: () => boolean;
}

export const UPDATE_CONFIRMATION = 'A new version is ready. Refresh now?';
export const TRANSACTION_BLOCKED_MESSAGE =
  'A wallet transaction is in progress. Refresh after it completes.';

function defaultRegister(url: string, options: { type: 'module' }): Promise<UpdateRegistration> {
  if (process.env.NODE_ENV !== 'production' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('service worker registration is unavailable'));
  }
  return navigator.serviceWorker.register(url, options) as unknown as Promise<UpdateRegistration>;
}

function defaultIsTransactionActive(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.querySelector('[data-active-wallet-transaction="true"]') !== null
  );
}

/**
 * Offers a deliberate refresh action when a new service worker has installed (#552).
 * The prompt never reloads by itself: an in-flight wallet transaction blocks it,
 * and a reload happens only after the user confirms.
 */
export function ServiceWorkerUpdatePrompt({
  register = defaultRegister,
  isTransactionActive = defaultIsTransactionActive,
  confirmReload = (message: string) => window.confirm(message),
  reload = () => window.location.reload(),
  hasController = () => Boolean(navigator.serviceWorker?.controller),
}: ServiceWorkerUpdatePromptProps) {
  const [updateReady, setUpdateReady] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const registrationRef = useRef<UpdateRegistration | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let removeWorkerListener: (() => void) | null = null;
    let removeRegistrationListener: (() => void) | null = null;

    register('/service-worker.js', { type: 'module' })
      .then((registration) => {
        if (disposed) return;
        registrationRef.current = registration;

        const onUpdateFound = () => {
          const worker = registration.installing;
          if (!worker) return;

          const onStateChange = () => {
            if (worker.state === 'installed' && hasController()) setUpdateReady(true);
          };
          worker.addEventListener('statechange', onStateChange);
          removeWorkerListener = () => worker.removeEventListener('statechange', onStateChange);
          onStateChange();
        };

        registration.addEventListener('updatefound', onUpdateFound);
        removeRegistrationListener = () =>
          registration.removeEventListener('updatefound', onUpdateFound);
      })
      .catch(() => {
        // No update prompt when registration is unavailable (e.g. development).
      });

    return () => {
      disposed = true;
      removeWorkerListener?.();
      removeRegistrationListener?.();
    };
    // `register` is the only value that controls the registration lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register]);

  const handleRefresh = () => {
    if (isTransactionActive()) {
      setBlockedMessage(TRANSACTION_BLOCKED_MESSAGE);
      return;
    }
    if (!confirmReload(UPDATE_CONFIRMATION)) return;

    setBlockedMessage(null);
    registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    if (!reloadedRef.current) {
      reloadedRef.current = true;
      reload();
    }
  };

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-blue-300 bg-white p-3 text-sm shadow-lg dark:border-blue-700 dark:bg-gray-900"
    >
      <div className="flex items-center gap-3">
        <span>A new version is ready.</span>
        <button
          type="button"
          className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800"
          onClick={handleRefresh}
        >
          Refresh to update
        </button>
      </div>
      {blockedMessage && (
        <p data-testid="service-worker-update-blocked" className="mt-2 text-amber-700 dark:text-amber-300">
          {blockedMessage}
        </p>
      )}
    </div>
  );
}

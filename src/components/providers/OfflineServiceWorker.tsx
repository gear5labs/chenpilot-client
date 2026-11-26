'use client';

import { useEffect } from 'react';
import { ServiceWorkerUpdatePrompt } from './ServiceWorkerUpdatePrompt';

export function OfflineServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/service-worker.js', { type: 'module' })
      .catch((error: unknown) => {
        console.error('[OfflineServiceWorker] Registration failed:', error);
      });
  }, []);

  return <ServiceWorkerUpdatePrompt />;
}

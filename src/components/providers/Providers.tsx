'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { initializeAuth } from '@/store/slices/authSlice';
import { initializeUI, setRateLimited } from '@/store/slices/uiSlice';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize authentication state from localStorage
    store.dispatch(initializeAuth());
    // Initialize UI state (theme, etc.)
    store.dispatch(initializeUI());

    // Global API event listeners
    const handleRateLimit = () => {
      store.dispatch(setRateLimited(true));
    };
    
    const handleSuccess = () => {
      // Auto-clear rate limit on successful request? 
      // Or maybe let the user dismiss it.
      // For now, let's keep it until manual dismissal or timeout.
    };

    window.addEventListener('api-rate-limit' as any, handleRateLimit);
    window.addEventListener('api-success' as any, handleSuccess);

    return () => {
      window.removeEventListener('api-rate-limit' as any, handleRateLimit);
      window.removeEventListener('api-success' as any, handleSuccess);
    };
  }, []);

  return (
    <Provider store={store}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Provider>
  );
}

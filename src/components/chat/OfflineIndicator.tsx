'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setOnlineStatus, loadMessageQueue } from '@/store/slices/chatSlice';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue } = useAppSelector((state) => state.chat);

  useEffect(() => {
    // Load queue on mount
    dispatch(loadMessageQueue());

    // Set up event listeners
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
    };

    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  if (isOnline && messageQueue.length === 0) {
    return null; // Don't show indicator when online with no queue
  }

  return (
    <div
      className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium z-40 transition-all duration-300 ${
        isOnline
          ? 'bg-blue-900/80 border border-blue-700 text-blue-200'
          : 'bg-red-900/80 border border-red-700 text-red-200 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>
            {messageQueue.length > 0
              ? `Online • ${messageQueue.length} message${messageQueue.length !== 1 ? 's' : ''} queued`
              : 'Connection restored'}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>
            You're offline • {messageQueue.length} message{messageQueue.length !== 1 ? 's' : ''} queued
          </span>
        </>
      )}
    </div>
  );
};

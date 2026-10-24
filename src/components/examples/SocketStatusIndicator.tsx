'use client';

import React from 'react';
import { useSocketConnection } from '@/hooks/useSocket';
import { Wifi, WifiOff, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

export function SocketStatusIndicator() {
  const { connectionState } = useSocketConnection();

  const renderContent = () => {
    switch (connectionState) {
      case 'connected':
  return (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-500">Connected</span>
        </>
        );
      case 'reconnecting':
        return (
        <>
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span className="text-amber-500">Reconnecting</span>
        </>
        );
      case 'failed':
        return (
          <>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-500">Failed</span>
          </>
        );
      case 'disconnected':
        return (
          <>
            <WifiOff className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Disconnected</span>
          </>
        );
      case 'unknown':
      default:
        return (
          <>
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400">Unknown</span>
          </>
        );
    }
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium">
      {renderContent()}
    </div>
  );
}

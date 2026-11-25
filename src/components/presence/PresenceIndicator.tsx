'use client';

import React from 'react';
import { PresenceStatus } from '@/services/presenceService';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PresenceIndicator({
  status,
  size = 'sm',
  showLabel = false,
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    online: 'bg-green-500 animate-pulse',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400',
  };

  const labelClasses = {
    online: 'text-green-600 dark:text-green-400',
    away: 'text-yellow-600 dark:text-yellow-400',
    offline: 'text-gray-600 dark:text-gray-400',
  };

  const labelText = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-full ${sizeClasses[size]} ${statusClasses[status]} ring-2 ring-white dark:ring-gray-900`}
        title={labelText[status]}
      />
      {showLabel && (
        <span className={`text-xs font-medium ${labelClasses[status]}`}>
          {labelText[status]}
        </span>
      )}
    </div>
  );
}

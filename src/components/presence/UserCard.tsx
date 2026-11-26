'use client';

import React from 'react';
import { PresenceIndicator } from './PresenceIndicator';
import { UserPresence } from '@/services/presenceService';

interface UserCardProps {
  presence: UserPresence;
  showConversation?: boolean;
}

export function UserCard({
  presence,
  showConversation = false,
}: UserCardProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      {/* Avatar with Status */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {getInitials(presence.userName)}
        </div>
        <div className="absolute bottom-0 right-0">
          <PresenceIndicator status={presence.status} size="md" />
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {presence.userName}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {presence.status === 'online'
            ? 'Active now'
            : presence.status === 'away'
              ? `Away • ${formatLastSeen(presence.lastSeen)}`
              : `Offline • ${formatLastSeen(presence.lastSeen)}`}
        </p>
        {showConversation && presence.conversationId && (
          <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
            In conversation
          </p>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            presence.status === 'online'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : presence.status === 'away'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {presence.status}
        </span>
      </div>
    </div>
  );
}

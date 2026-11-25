'use client';

import React from 'react';
import { Users } from 'lucide-react';
import {
  useOnlineUsers,
  useAwayUsers,
  usePresenceCounts,
} from '@/hooks/usePresenceManagement';
import { UserCard } from './UserCard';

interface ActiveUsersPanelProps {
  showConversationInfo?: boolean;
  compact?: boolean;
}

export function ActiveUsersPanel({
  showConversationInfo = false,
  compact = false,
}: ActiveUsersPanelProps) {
  const onlineUsers = useOnlineUsers();
  const awayUsers = useAwayUsers();
  const { online, away } = usePresenceCounts();

  const totalActive = online + away;

  if (totalActive === 0 && !compact) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No active users</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {online} online
          {away > 0 && `, ${away} away`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            Online ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <UserCard
                key={user.userId}
                presence={user}
                showConversation={showConversationInfo}
              />
            ))}
          </div>
        </div>
      )}

      {/* Away Users */}
      {awayUsers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
            Away ({awayUsers.length})
          </h3>
          <div className="space-y-2">
            {awayUsers.map((user) => (
              <UserCard
                key={user.userId}
                presence={user}
                showConversation={showConversationInfo}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { dequeueMessage } from '@/store/slices/chatSlice';
import { buildOfflineQueueRows } from '@/utils/offlineQueueDisplay';
import { confirmQueueRemoval } from '@/utils/offlineQueueRemoval';

/**
 * Shows locally queued messages with their delivery state (#547). A queued row
 * is explicitly labelled "not sent" until the service acknowledges it.
 */
export function OfflineQueueList() {
  const dispatch = useAppDispatch();
  const { messageQueue, messages } = useAppSelector((state) => state.chat);
  const rows = buildOfflineQueueRows(messageQueue, messages);

  // Removing one row dispatches only its id; dequeueMessage persists the
  // remaining queue, so unrelated queued work is untouched (#548).
  const discard = (row: { id: string; query: string }) => {
    if (!confirmQueueRemoval(row.query, (message) => window.confirm(message))) return;
    dispatch(dequeueMessage(row.id));
  };

  if (rows.length === 0) return null;

  return (
    <ul
      className="fixed bottom-32 left-1/2 z-30 w-[min(28rem,90vw)] -translate-x-1/2 space-y-1 rounded-lg border border-gray-300 bg-white/95 p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900/95"
      aria-label="Queued messages and delivery state"
    >
      {rows.map((row) => (
        <li
          key={row.id}
          data-testid={`offline-queue-row-${row.id}`}
          className="flex items-center justify-between gap-3 rounded px-2 py-1"
        >
          <span className="min-w-0 flex-1 truncate" title={row.query}>
            {row.query}
          </span>
          <span
            data-testid={`offline-queue-state-${row.id}`}
            className={row.acknowledged ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}
          >
            {row.label}
          </span>
          <button
            type="button"
            aria-label={`Discard unsent message ${row.id}`}
            className="rounded px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
            onClick={() => discard(row)}
          >
            Discard
          </button>
        </li>
      ))}
    </ul>
  );
}

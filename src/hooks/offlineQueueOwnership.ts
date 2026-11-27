/**
 * Ownership guard for the persisted offline queue (#549).
 *
 * The queue lives in one global localStorage key, so its entries must carry
 * the authenticated account that created them. Legacy rows with no owner are
 * treated as untrusted and quarantined instead of being replayed under a
 * different account.
 */

export const OFFLINE_QUEUE_OWNER_KEY = 'offlineQueueOwnerId';
export const OFFLINE_QUEUE_OWNER_MISMATCH_NOTICE =
  'Queued messages from a previous account were removed and were not sent.';

export interface OfflineQueueEntry {
  id: string;
  query: string;
  timestamp?: string;
  ownerId?: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readOfflineQueueOwner(storage: StorageLike | null = getStorage()): string | null {
  try {
    return storage?.getItem(OFFLINE_QUEUE_OWNER_KEY) || null;
  } catch {
    return null;
  }
}

export function rememberOfflineQueueOwner(
  userId: string | null | undefined,
  storage: StorageLike | null = getStorage(),
): void {
  try {
    if (!userId) {
      storage?.removeItem(OFFLINE_QUEUE_OWNER_KEY);
      return;
    }
    storage?.setItem(OFFLINE_QUEUE_OWNER_KEY, userId);
  } catch {
    // Storage failures are reported by the persistence layer; ownership must
    // never block a queue write in memory.
  }
}

export interface OfflineQueuePartition<T extends OfflineQueueEntry> {
  owned: T[];
  quarantined: T[];
}

export function partitionQueueByOwner<T extends OfflineQueueEntry>(
  queue: readonly T[],
  userId: string | null | undefined,
  storedOwnerId: string | null = readOfflineQueueOwner(),
): OfflineQueuePartition<T> {
  const owned: T[] = [];
  const quarantined: T[] = [];

  for (const entry of queue) {
    const entryOwner = entry.ownerId ?? storedOwnerId;
    if (userId && entryOwner && entryOwner === userId) {
      owned.push(entry);
    } else {
      quarantined.push(entry);
    }
  }

  return { owned, quarantined };
}

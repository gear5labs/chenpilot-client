import { describe, expect, it } from 'vitest';
import {
  OFFLINE_QUEUE_OWNER_KEY,
  OFFLINE_QUEUE_OWNER_MISMATCH_NOTICE,
  partitionQueueByOwner,
  readOfflineQueueOwner,
  rememberOfflineQueueOwner,
  type OfflineQueueEntry,
} from './offlineQueueOwnership';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const entries: OfflineQueueEntry[] = [
  { id: 'q1', query: 'first private prompt', timestamp: '2026-11-24T00:00:00Z' },
  { id: 'q2', query: 'second private prompt', timestamp: '2026-11-24T00:01:00Z' },
];

describe('offline queue ownership guard (#549)', () => {
  it('replays entries only for the account that queued them', () => {
    const storage = createStorage({ [OFFLINE_QUEUE_OWNER_KEY]: 'user-a' });

    expect(partitionQueueByOwner(entries, 'user-a', readOfflineQueueOwner(storage))).toEqual({
      owned: entries,
      quarantined: [],
    });
  });

  it('quarantines every entry when the authenticated account changed', () => {
    const storage = createStorage({ [OFFLINE_QUEUE_OWNER_KEY]: 'user-a' });

    expect(partitionQueueByOwner(entries, 'user-b', readOfflineQueueOwner(storage))).toEqual({
      owned: [],
      quarantined: entries,
    });
    expect(OFFLINE_QUEUE_OWNER_MISMATCH_NOTICE).not.toContain(entries[0].query);
  });

  it('quarantines legacy entries with no recorded owner', () => {
    const storage = createStorage();

    expect(partitionQueueByOwner(entries, 'user-a', readOfflineQueueOwner(storage))).toEqual({
      owned: [],
      quarantined: entries,
    });
  });

  it('never replays persisted work without an authenticated user', () => {
    const storage = createStorage({ [OFFLINE_QUEUE_OWNER_KEY]: 'user-a' });

    expect(partitionQueueByOwner(entries, null, readOfflineQueueOwner(storage))).toEqual({
      owned: [],
      quarantined: entries,
    });
  });

  it('honours an explicit per-entry owner over the global queue owner', () => {
    const storage = createStorage({ [OFFLINE_QUEUE_OWNER_KEY]: 'user-a' });
    const mixed = [
      { ...entries[0], ownerId: 'user-b' },
      { ...entries[1], ownerId: 'user-a' },
    ];

    expect(partitionQueueByOwner(mixed, 'user-a', readOfflineQueueOwner(storage))).toEqual({
      owned: [mixed[1]],
      quarantined: [mixed[0]],
    });
  });

  it('stores and clears the queue owner as authentication changes', () => {
    const storage = createStorage();

    rememberOfflineQueueOwner('user-a', storage);
    expect(readOfflineQueueOwner(storage)).toBe('user-a');

    rememberOfflineQueueOwner(null, storage);
    expect(readOfflineQueueOwner(storage)).toBeNull();
  });
});

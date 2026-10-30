import { describe, expect, it } from 'vitest';
import {
  QUEUEABLE_OFFLINE_ACTIONS,
  isQueueableOfflineAction,
  offlineQueueRefusal,
} from './offlineActions';

describe('offline action allowlist', () => {
  it('queues only chat messages', () => {
    expect(QUEUEABLE_OFFLINE_ACTIONS).toEqual(['chat_message']);
    expect(isQueueableOfflineAction('chat_message')).toBe(true);
    expect(offlineQueueRefusal('chat_message')).toBeNull();
  });

  it.each(['payment', 'transaction_signing', 'wallet_connection', 'contact_mutation', 'account_change'])(
    'excludes %s by default with a reason',
    (kind) => {
      expect(isQueueableOfflineAction(kind)).toBe(false);
      expect(offlineQueueRefusal(kind)).toMatch(/not queued offline/);
    },
  );

  it('treats an unknown kind as not queueable', () => {
    expect(isQueueableOfflineAction('something_new')).toBe(false);
    expect(offlineQueueRefusal('something_new')).toMatch(/not queued offline/);
  });
});

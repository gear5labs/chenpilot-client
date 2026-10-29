import { describe, it, expect } from 'vitest';
import { offlineQueueRefusal } from '../offlineActions';

describe('offlineActions allowlist', () => {
  it('permits chat_message', () => {
    expect(offlineQueueRefusal('chat_message')).toBeNull();
  });

  it('refuses payments and signing with a message', () => {
    expect(offlineQueueRefusal('payment')).toMatch(/payments/i);
    expect(offlineQueueRefusal('send_payment')).toMatch(/payments/i);
    expect(offlineQueueRefusal('signing')).toMatch(/signing/i);
    expect(offlineQueueRefusal('deploy_contract')).toMatch(/contract deployment/i);
    expect(offlineQueueRefusal('unknown_action')).toMatch(/not supported/i);
  });
});

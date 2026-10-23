import { describe, it, expect } from 'vitest';
import contactsReducer, { clearError, setSelectedContact } from '../contactsSlice';

describe('contacts create, edit, and delete workflow state (#343)', () => {
  it('manages selected contact and clears error state cleanly', () => {
    const sampleContact = {
      id: 'c_1',
      name: 'Alice Stellar',
      address: 'G' + 'B'.repeat(55),
      tokenType: 'USDC' as const,
      createdAt: '2026-10-19T00:00:00Z',
      updatedAt: '2026-10-19T00:00:00Z',
    };
    const next = contactsReducer(undefined, setSelectedContact(sampleContact));
    expect(next.selectedContact?.name).toBe('Alice Stellar');
    const cleared = contactsReducer({ ...next, error: 'Failed' }, clearError());
    expect(cleared.error).toBeNull();
  });
});

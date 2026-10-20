import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '@/constants';

describe('contact and transaction service API contracts (#345)', () => {
  it('exposes canonical endpoints for contacts CRUD and transaction history', () => {
    expect(API_ENDPOINTS.CONTACTS.LIST).toBe('/contacts');
    expect(API_ENDPOINTS.CONTACTS.CREATE).toBe('/contacts');
    expect(API_ENDPOINTS.ACCOUNT.TRANSACTIONS).toBe('/account/transactions');
    expect(API_ENDPOINTS.ACCOUNT.BALANCE).toBe('/account/balance');
  });
});

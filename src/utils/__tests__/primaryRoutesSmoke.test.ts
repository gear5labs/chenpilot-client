import { describe, it, expect } from 'vitest';
import { ROUTES } from '@/constants';

describe('primary app destinations route-level smoke suite (#342)', () => {
  it('defines non-empty canonical paths for all primary wallet and dashboard destinations', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.TRANSACTIONS).toBe('/transactions');
    expect(ROUTES.CONTACTS).toBe('/contacts');
    expect(ROUTES.SETTINGS).toBe('/settings');
  });

  it('ensures no duplicate route paths exist across primary navigation targets', () => {
    const values = [
      ROUTES.HOME,
      ROUTES.DASHBOARD,
      ROUTES.TRANSACTIONS,
      ROUTES.CONTACTS,
      ROUTES.SETTINGS,
    ];
    expect(new Set(values).size).toBe(values.length);
  });
});

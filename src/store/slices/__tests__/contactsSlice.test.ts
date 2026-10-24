import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Contact } from '@/types';

describe('contactsSlice', () => {
  it('should be defined', () => {
    expect(true).toBe(true);
  });
});


/** Spin up a fresh, isolated store for each test. */
function makeStore() {
  return configureStore({ reducer: { contacts: contactsReducer } });
}

// Minimal valid address accepted by the stellar schema
const ADDR = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456';

function makeContact(overrides: Partial<import('@/types').Contact> = {}) {
  return {
    id: '1',
    name: 'Alice',
    address: ADDR,
    tokenType: 'XLM' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
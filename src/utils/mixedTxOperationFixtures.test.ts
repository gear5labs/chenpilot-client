import { describe, expect, it } from 'vitest';
import {
  MIXED_OPERATION_FIXTURES,
  MIXED_TRANSACTION_FIXTURE,
} from './mixedTxOperationFixtures';
import { mergeNewestTransactionHistory } from './transactionHistory';

describe('mixedTxOperationFixtures (#245)', () => {
  it('covers payment, create_account, change_trust, and unknown manage_data operations', () => {
    const types = MIXED_OPERATION_FIXTURES.map((op) => op.type);
    expect(types).toEqual(['payment', 'create_account', 'change_trust', 'manage_data']);
    expect(MIXED_TRANSACTION_FIXTURE.operation_count).toBe(MIXED_OPERATION_FIXTURES.length);
  });

  it('integrates cleanly with transactionHistory reconciliation helpers', () => {
    const merged = mergeNewestTransactionHistory([], [MIXED_TRANSACTION_FIXTURE]);
    expect(merged).toHaveLength(1);
    expect(merged[0].operations.map((op) => op.id)).toEqual([
      'op_payment_1',
      'op_create_account_2',
      'op_change_trust_3',
      'op_unknown_4',
    ]);
  });
});

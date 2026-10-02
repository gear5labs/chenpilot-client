import { describe, expect, it } from 'vitest';
import { serializeTransactionsToCsv } from './transactionCsv';
import { StellarTransaction } from '@/types';

const sample: StellarTransaction = {
  id: '1', hash: 'abc,"quoted"', ledger: 42, created_at: '2026-09-30T10:00:00Z',
  source_account: 'G-SENDER', fee_charged: '100', operation_count: 1, successful: true,
  operations: [{ id: 'op1', type: 'payment', amount: '2.5', asset: 'XLM', from: 'G-SENDER', to: 'G-RECEIVER', source_account: 'G-SENDER' }],
};

describe('serializeTransactionsToCsv', () => {
  it('writes a stable header and normalized transaction data', () => {
    expect(serializeTransactionsToCsv([sample])).toBe([
      'hash,type,asset,amount,direction,status,timestamp',
      '"abc,""quoted""",payment,XLM,2.5,outgoing,success,2026-09-30T10:00:00.000Z',
    ].join('\r\n'));
  });

  it('escapes commas, quotes, and line breaks and preserves input row order', () => {
    const second = { ...sample, id: '2', hash: 'second', successful: false,
      operations: [{ ...sample.operations[0], type: 'memo,\"line\nnext' }] };
    const csv = serializeTransactionsToCsv([sample, second]);
    expect(csv).toContain('"memo,""line\nnext",XLM');
    expect(csv.indexOf('abc,')).toBeLessThan(csv.indexOf('second'));
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('emits only the header when there are no rows', () => {
    expect(serializeTransactionsToCsv([])).toBe('hash,type,asset,amount,direction,status,timestamp');
  });
});

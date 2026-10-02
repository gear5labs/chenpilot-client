// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StellarTransaction } from '@/types';

const { serialize } = vi.hoisted(() => ({ serialize: vi.fn(() => 'hash,type,asset,amount,direction,status,timestamp\r\nfiltered,payment,XLM,1,outgoing,success,2026-09-30T10:00:00.000Z') }));
vi.mock('@/utils/transactionCsv', () => ({ serializeTransactionsToCsv: serialize }));

import TransactionTable from './TransactionTable';

const row: StellarTransaction = {
  id: '1', hash: 'filtered', ledger: 1, created_at: '2026-09-30T10:00:00Z', source_account: 'G1',
  fee_charged: '100', operation_count: 1, successful: true,
  operations: [{ id: 'op1', type: 'payment', amount: '1', asset: 'XLM', from: 'G1', to: 'G2', source_account: 'G1' }],
};

describe('TransactionTable CSV export', () => {
  it('exports the rows it receives in their existing filtered order', () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:csv') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const filteredRows = [{ ...row, id: 'filtered-row' }];
    render(React.createElement(TransactionTable, {
      transactions: filteredRows, isLoading: false, error: null, currentPage: 1, pageSize: 10,
      totalCount: 1, onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
    }));
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(serialize).toHaveBeenCalledWith(filteredRows);
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it('disables export when the result is empty with an explanation', () => {
    render(React.createElement(TransactionTable, {
      transactions: [], isLoading: false, error: null, currentPage: 1, pageSize: 10,
      totalCount: 0, onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
    }));
    expect(screen.getByRole('button', { name: /export csv/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /export csv/i }).parentElement?.getAttribute('title')).toContain('no transactions');
  });
});

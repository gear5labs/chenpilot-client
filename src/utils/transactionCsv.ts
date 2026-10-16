import { StellarTransaction } from '@/types';

export const TRANSACTION_CSV_HEADERS = [
  'hash',
  'type',
  'asset',
  'amount',
  'direction',
  'status',
  'timestamp',
] as const;

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toIsoTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** Serialize the supplied (already filtered and ordered) transaction rows as RFC 4180 CSV. */
export function serializeTransactionsToCsv(transactions: readonly StellarTransaction[]): string {
  const rows = transactions.map((transaction) => {
    const operation = transaction.operations[0];
    const direction = operation?.to === transaction.source_account
      ? 'incoming'
      : operation?.from === transaction.source_account || operation?.source_account === transaction.source_account
        ? 'outgoing'
        : 'unknown';
    return [
      transaction.hash,
      operation?.type ?? 'unknown',
      operation?.asset ?? 'XLM',
      operation?.amount ?? '',
      direction,
      transaction.successful ? 'success' : 'failed',
      toIsoTimestamp(transaction.created_at),
    ];
  });
  return [TRANSACTION_CSV_HEADERS, ...rows]
    .map((row) => row.map((value) => escapeCsv(String(value))).join(','))
    .join('\r\n');
}

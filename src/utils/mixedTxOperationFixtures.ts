import { StellarOperation, StellarTransaction } from '@/types';

/**
 * Reusable mixed Stellar operation & transaction fixtures covering payment,
 * create_account, change_trust, and unknown/unmodeled operation types (#245).
 */
export const MIXED_OPERATION_FIXTURES: readonly StellarOperation[] = [
  {
    id: 'op_payment_1',
    type: 'payment',
    amount: '25.5000000',
    asset: 'USDC',
    asset_code: 'USDC',
    asset_issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    asset_type: 'credit_alphanum4',
    from: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    to: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWJX',
    source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    direction: 'outgoing',
  },
  {
    id: 'op_create_account_2',
    type: 'create_account',
    amount: '2.0000000',
    asset: 'XLM',
    asset_type: 'native',
    from: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    to: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCW3A',
    source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    direction: 'outgoing',
  },
  {
    id: 'op_change_trust_3',
    type: 'change_trust',
    asset: 'USDT',
    asset_code: 'USDT',
    asset_issuer: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    asset_type: 'credit_alphanum4',
    source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    direction: 'self',
  },
  {
    id: 'op_unknown_4',
    type: 'manage_data',
    source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    direction: 'unknown',
  },
];

export const MIXED_TRANSACTION_FIXTURE: StellarTransaction = {
  id: 'tx_mixed_ops_245',
  hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  ledger: 54120987,
  created_at: '2026-10-20T00:00:00Z',
  source_account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  fee_charged: '0.0004000',
  operation_count: 4,
  successful: true,
  memo: 'mixed-ops-fixture',
  memo_type: 'text',
  direction: 'outgoing',
  operations: [...MIXED_OPERATION_FIXTURES],
};

# Rare Failure Mode Fixtures & Manual Repair Paths (#922)

This document details deterministic test fixtures for reproducing and repairing rare Stellar prompt marketplace failure modes without manual database or ledger manipulation.

## 1. Corrupt Prompt Metadata Hash (`fix-001`)
- **Description:** The SHA-256 prompt hash recorded on the Stellar ledger does not match the IPFS metadata CID payload.
- **Fixture ID:** `fix-001`
- **Expected Repair Path:**
  ```typescript
  import { fixtureRepairManager } from '@/services/fixtureRepairManager';

  const result = fixtureRepairManager.repairMetadataHash('prompt-892a');
  console.log(result.message); // Re-aligns metadata hash with Stellar ledger memo
  ```

## 2. Orphaned Pending Buyer Escrow (`fix-002`)
- **Description:** A Stellar escrow transaction remains stuck in `pending` status due to a network or client timeout during Stellar signing.
- **Fixture ID:** `fix-002`
- **Expected Repair Path:**
  ```typescript
  import { fixtureRepairManager } from '@/services/fixtureRepairManager';

  const result = fixtureRepairManager.repairOrphanedEscrow('escrow-992b');
  console.log(result.repairedPayload.status); // 'REFUNDED_TO_BUYER'
  ```

## 3. Desynced Prompt Version Ledger State (`fix-003`)
- **Description:** Local creator prompt version sequence is out of sync with Horizon ledger state sequence numbers.
- **Fixture ID:** `fix-003`

## Running Fixture Validation Tests
Run `npm test` or `npx vitest run src/services/__tests__/fixtureRepairManager.test.ts` to confirm schema validity and repair flow execution.

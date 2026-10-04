/**
 * Fixture Repair Manager (#922)
 * Manages test fixtures for rare failure modes, schema validation,
 * and deterministic manual/automated repair flows.
 */

import failureFixtures from '@/fixtures/failureModesFixtures.json';

export interface FailureModeFixture {
  id: string;
  title: string;
  failureType: 'CORRUPT_PROMPT_METADATA_HASH' | 'ORPHANED_PENDING_BUYER_ESCROW' | 'DESYNCED_PROMPT_VERSION_LEDGER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedResource: string;
  payload: Record<string, unknown>;
  repairInstructions: string;
}

export interface RepairResult {
  success: boolean;
  fixtureId: string;
  message: string;
  repairedPayload?: Record<string, unknown>;
}

export class FixtureRepairManager {
  private fixtures: FailureModeFixture[] = [];

  constructor() {
    this.fixtures = failureFixtures as FailureModeFixture[];
  }

  /**
   * Load and validate local environment failure fixtures.
   */
  loadFixtures(): FailureModeFixture[] {
    return this.fixtures.map((f) => {
      this.validateFixtureSchema(f);
      return f;
    });
  }

  /**
   * Validate that a fixture adheres strictly to current schema contracts.
   */
  validateFixtureSchema(fixture: FailureModeFixture): boolean {
    if (!fixture.id || typeof fixture.id !== 'string') {
      throw new Error(`Invalid fixture schema: missing or invalid 'id'`);
    }
    if (!fixture.title || typeof fixture.title !== 'string') {
      throw new Error(`Invalid fixture schema: missing or invalid 'title' in ${fixture.id}`);
    }
    if (!fixture.failureType || typeof fixture.failureType !== 'string') {
      throw new Error(`Invalid fixture schema: missing 'failureType' in ${fixture.id}`);
    }
    if (!fixture.repairInstructions || typeof fixture.repairInstructions !== 'string') {
      throw new Error(`Invalid fixture schema: missing 'repairInstructions' in ${fixture.id}`);
    }
    if (!fixture.payload || typeof fixture.payload !== 'object') {
      throw new Error(`Invalid fixture schema: missing or non-object 'payload' in ${fixture.id}`);
    }
    return true;
  }

  /**
   * Get a specific failure mode fixture by ID.
   */
  getFixtureById(id: string): FailureModeFixture | undefined {
    return this.fixtures.find((f) => f.id === id);
  }

  /**
   * Repair path 1: Repair Metadata Hash Mismatch.
   */
  repairMetadataHash(promptId: string): RepairResult {
    const fixture = this.fixtures.find((f) => f.payload.promptId === promptId);
    if (!fixture) {
      return { success: false, fixtureId: promptId, message: `Fixture for prompt ID ${promptId} not found` };
    }

    const repairedPayload = {
      ...fixture.payload,
      actualMetadataHash: fixture.payload.ledgerHash, // Re-align metadata hash with ledger sequence
      repairedAt: new Date().toISOString(),
      status: 'RESOLVED',
    };

    return {
      success: true,
      fixtureId: fixture.id,
      message: `Metadata hash re-aligned and synced with Stellar ledger reference for ${promptId}`,
      repairedPayload,
    };
  }

  /**
   * Repair path 2: Repair Orphaned Escrow.
   */
  repairOrphanedEscrow(escrowId: string): RepairResult {
    const fixture = this.fixtures.find((f) => f.payload.escrowId === escrowId);
    if (!fixture) {
      return { success: false, fixtureId: escrowId, message: `Fixture for escrow ID ${escrowId} not found` };
    }

    const repairedPayload = {
      ...fixture.payload,
      status: 'REFUNDED_TO_BUYER',
      refundTxHash: '0x992b_refund_stellar_tx_hash',
      repairedAt: new Date().toISOString(),
    };

    return {
      success: true,
      fixtureId: fixture.id,
      message: `Automatic Stellar refund issued for escrow ${escrowId}`,
      repairedPayload,
    };
  }
}

export const fixtureRepairManager = new FixtureRepairManager();
export default fixtureRepairManager;

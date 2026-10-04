import { describe, it, expect, beforeEach } from 'vitest';
import { FixtureRepairManager } from '../fixtureRepairManager';

describe('FixtureRepairManager (#922)', () => {
  let manager: FixtureRepairManager;

  beforeEach(() => {
    manager = new FixtureRepairManager();
  });

  it('loads fixtures reliably in local environment and matches expected schema', () => {
    const fixtures = manager.loadFixtures();
    expect(fixtures).toHaveLength(3);

    fixtures.forEach((fixture) => {
      expect(fixture.id).toBeDefined();
      expect(fixture.title).toBeDefined();
      expect(fixture.failureType).toBeDefined();
      expect(fixture.repairInstructions).toBeDefined();
      expect(fixture.payload).toBeDefined();
    });
  });

  it('documents expected repair instructions for every fixture', () => {
    const fixtures = manager.loadFixtures();
    fixtures.forEach((f) => {
      expect(f.repairInstructions.length).toBeGreaterThan(10);
    });
  });

  it('confirms validity and repair flow for corrupt metadata hash fixture (fix-001)', () => {
    const result = manager.repairMetadataHash('prompt-892a');

    expect(result.success).toBe(true);
    expect(result.fixtureId).toBe('fix-001');
    expect(result.message).toContain('re-aligned');
    expect(result.repairedPayload?.status).toBe('RESOLVED');
  });

  it('confirms validity and repair flow for orphaned buyer escrow fixture (fix-002)', () => {
    const result = manager.repairOrphanedEscrow('escrow-992b');

    expect(result.success).toBe(true);
    expect(result.fixtureId).toBe('fix-002');
    expect(result.repairedPayload?.status).toBe('REFUNDED_TO_BUYER');
    expect(result.repairedPayload?.refundTxHash).toBeDefined();
  });

  it('returns failure result when requesting non-existent fixture repair', () => {
    const result = manager.repairOrphanedEscrow('non-existent-escrow');
    expect(result.success).toBe(false);
  });
});

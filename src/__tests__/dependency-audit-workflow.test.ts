import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CI dependency vulnerability and license audit workflow (#340)', () => {
  const root = path.resolve(__dirname, '../..');

  it('configures pnpm audit with high severity threshold and license checks without exposing secrets', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/dependency-audit.yml'), 'utf8');
    expect(wf).toContain('pnpm audit --audit-level=high');
    expect(wf).toContain('actions/dependency-review-action@v4');
    expect(wf).toContain('deny-licenses:');
    expect(wf).not.toContain('secrets.');
  });
});

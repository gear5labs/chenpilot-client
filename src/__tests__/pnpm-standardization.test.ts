import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('pnpm lockfile standardization (#337)', () => {
  const root = path.resolve(__dirname, '../..');

  it('retains pnpm-lock.yaml as sole lockfile and declares packageManager in package.json', () => {
    expect(fs.existsSync(path.join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'package-lock.json'))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(String(pkg.packageManager || '')).toMatch(/^pnpm@/);
  });
});

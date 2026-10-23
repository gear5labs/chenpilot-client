import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('generated install and test output logs hygiene (#336)', () => {
  const root = path.resolve(__dirname, '../..');

  it('ignores npm-install.log and vitest-out.txt in .gitignore and removes tracked copies', () => {
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    expect(gitignore).toContain('npm-install.log');
    expect(gitignore).toContain('vitest-out.txt');
    expect(fs.existsSync(path.join(root, 'npm-install.log'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'vitest-out.txt'))).toBe(false);
  });
});

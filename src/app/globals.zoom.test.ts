import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();
const source = readFileSync(path.resolve(root, 'src/app/globals.css'), 'utf8');

describe('#313 — globals.css zoom / text-scaling reflow', () => {
  it('prevents horizontal scrolling at 200% zoom / 320px CSS viewport', () => {
    expect(source).toContain('body {');
    expect(source).toContain('min-width: 0');
    expect(source).toContain('overflow-x: hidden');
  });

  it('provides a utility that wraps long wallet addresses, hashes, and keys when text scales up', () => {
    expect(source).toContain('.break-long-value {');
    expect(source).toContain('overflow-wrap: break-word');
    expect(source).toContain('word-break: break-all');
  });
});

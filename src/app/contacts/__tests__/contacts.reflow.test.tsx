import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();
const source = readFileSync(path.resolve(root, 'src/app/contacts/page.tsx'), 'utf8');

describe('#313 — Contacts page zoom / text-scaling reflow', () => {
  it('wraps long wallet addresses so they do not overlap the copy button at 320px / 200% zoom', () => {
    expect(source).toContain('break-long-value');
    expect(source).toContain('flex-1 min-w-0 text-start');
  });

  it('reflows the contacts grid to a single column on small viewports', () => {
    expect(source).toContain('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6');
  });

  it('keeps readable field labels', () => {
    expect(source).toContain('{t("contacts.address")}');
    expect(source).toContain('{t("contacts.name")}');
  });
});
